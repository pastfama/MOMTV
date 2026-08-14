// ============================================================
// MOMTV — Main Server
// ============================================================
// Serves the viewer and runs the continuous pipeline:
// Twitch HLS capture → Video Indexer → Foundry agents → show output.
// ============================================================

import { BlobServiceClient } from "@azure/storage-blob";
import { analyzeSegment, type VideoIndexResult } from "./video-indexer/indexer-client.js";
import { captureSegment } from "./stream-capture/hls-capture.js";
import { AnalyticsStore, type AnalyticsRecord } from "./analytics/analytics-store.js";

// ── Configuration ──────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3000", 10);
const AZURE_STORAGE_CONNECTION = process.env.AZURE_STORAGE_CONNECTION || "";
const PROJECT_ENDPOINT =
  process.env.FOUNDRY_PROJECT_ENDPOINT ||
  "https://cog-cdwzd6d3oc77y.services.ai.azure.com/api/projects/resilient-steering-dev";
const TWITCH_CHANNEL = process.env.TWITCH_CHANNEL || "KNIG04Ei";

// ── State ──────────────────────────────────────────────────────

let latestSegment: {
  timestamp: number;
  videoAnalysis: VideoIndexerResult | null;
  agentOutput: { agent: string; content: string; timestamp: number } | null;
} | null = null;

// SSE subscribers for the /api/vi-stream endpoint
const sseClients: Array<{ res: any; id: number }> = [];
let sseClientId = 0;

function broadcastSSE(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.res.write(payload);
    } catch {
      // Client disconnected
      sseClients.splice(i, 1);
    }
  }
}

// ── Analytics Store ───────────────────────────────────────────

const analyticsStore = new AnalyticsStore();

// ── Foundry Agent Client ──────────────────────────────────────

async function invokeAgent(agentName: string, input: string): Promise<string> {
  const endpoint = `${PROJECT_ENDPOINT}/agents/${agentName}/endpoint/protocols/openai/responses?api-version=v1`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "agent",
      input,
      store: true,
      background: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Agent ${agentName} failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    output?: Array<{
      type: string;
      content?: Array<{ type: string; text?: string }>;
    }>;
  };

  let text = "";
  for (const item of data.output || []) {
    if (item.type === "message" && item.content) {
      for (const c of item.content) {
        if (c.type === "output_text" && c.text) text += c.text;
      }
    }
  }
  return text;
}

// ── Pipeline Loop ─────────────────────────────────────────────

async function runPipeline(): Promise<void> {
  while (true) {
    try {
      console.log(`[Pipeline] Capturing segment from ${TWITCH_CHANNEL}...`);

      const blobClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION);
      const capture = await captureSegment(blobClient);

      if (!capture) {
        console.warn("[Pipeline] No segment captured, retrying in 30s...");
        await sleep(30_000);
        continue;
      }

      console.log(`[Pipeline] Analyzing segment ${capture.segmentId}...`);
      const analysis = await analyzeSegment(capture.blobUrl, capture.segmentId);

      // Format analysis for agent
      const parts: string[] = [];
      if (analysis.transcript?.length) {
        parts.push(`Transcript: ${analysis.transcript.map((t) => t.text).join(" ")}`);
      }
      if (analysis.ocr?.length) {
        parts.push(`On-screen text: ${analysis.ocr.map((o) => o.text).join(", ")}`);
      }
      if (analysis.topics?.length) {
        parts.push(`Topics: ${analysis.topics.map((t) => t.name).join(", ")}`);
      }

      console.log("[Pipeline] Invoking show-producer agent...");
      const agentText = await invokeAgent(
        "show-producer",
        `Stream analysis for ${TWITCH_CHANNEL}:\n\n${parts.join("\n")}\n\nGenerate anchor script for Alex and Sasha. Output JSON.`,
      );

      latestSegment = {
        timestamp: Date.now(),
        videoAnalysis: analysis,
        agentOutput: { agent: "show-producer", content: agentText, timestamp: Date.now() },
      };

      // Broadcast to SSE subscribers
      broadcastSSE("segment", {
        timestamp: latestSegment.timestamp,
        segmentId: capture.segmentId,
        transcript: analysis.transcript || [],
        ocr: analysis.ocr || [],
        scenes: analysis.scenes || [],
        topics: analysis.topics || [],
        summary: analysis.summary || "",
        agentOutput: latestSegment.agentOutput,
      });

      console.log("[Pipeline] Segment complete ✓");
    } catch (error) {
      console.error("[Pipeline] Error:", error);
    }

    await sleep(30_000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── HTTP Server ───────────────────────────────────────────────

function startServer(): void {
  const http = require("http");
  const fs = require("fs");
  const path = require("path");

  const server = http.createServer((req: any, res: any) => {
    // API: Latest segment
    if (req.url === "/api/latest-segment") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(latestSegment || { timestamp: 0 }));
      return;
    }

    // API: Analytics — record events (POST) or get summary (GET)
    if (req.url?.startsWith("/api/analytics")) {
      // CORS preflight
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        });
        res.end();
        return;
      }

      res.setHeader("Access-Control-Allow-Origin", "*");

      // POST /api/analytics/record — batch of analytics records
      if (req.method === "POST" && req.url === "/api/analytics/record") {
        let body = "";
        req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        req.on("end", () => {
          try {
            const records = JSON.parse(body) as AnalyticsRecord[];
            analyticsStore.recordBatch(records);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, accepted: records.length }));
          } catch (err) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
        });
        return;
      }

      // GET /api/analytics/stats — store statistics
      if (req.method === "GET" && req.url === "/api/analytics/stats") {
        const stats = analyticsStore.getStats();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(stats));
        return;
      }

      // GET /api/analytics/summary — summary of last 24h
      if (req.method === "GET" && req.url === "/api/analytics/summary") {
        analyticsStore.getSummary(24).then((summary) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(summary));
        }).catch((err: Error) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        });
        return;
      }

      // POST /api/analytics/flush — force flush
      if (req.method === "POST" && req.url === "/api/analytics/flush") {
        analyticsStore.flush().then(() => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        }).catch((err: Error) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        });
        return;
      }

      res.writeHead(404);
      res.end("Not found");
      return;
    }

    // API: Video Indexer SSE stream
    if (req.url === "/api/vi-stream") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      // Send initial comment to establish connection
      res.write(":ok\n\n");

      // Send latest segment immediately if available
      if (latestSegment?.videoAnalysis) {
        const initData = JSON.stringify({
          timestamp: latestSegment.timestamp,
          segmentId: latestSegment.videoAnalysis.videoId,
          transcript: latestSegment.videoAnalysis.transcript || [],
          ocr: latestSegment.videoAnalysis.ocr || [],
          scenes: latestSegment.videoAnalysis.scenes || [],
          topics: latestSegment.videoAnalysis.topics || [],
          summary: latestSegment.videoAnalysis.summary || "",
          agentOutput: latestSegment.agentOutput,
        });
        res.write(`event: segment\ndata: ${initData}\n\n`);
      }

      const clientId = ++sseClientId;
      sseClients.push({ res, id: clientId });
      console.log(`[Server] SSE client ${clientId} connected (${sseClients.length} total)`);

      req.on("close", () => {
        const idx = sseClients.findIndex((c) => c.id === clientId);
        if (idx !== -1) sseClients.splice(idx, 1);
        console.log(`[Server] SSE client ${clientId} disconnected (${sseClients.length} total)`);
      });
      return;
    }

    // Static: Viewer
    let filePath = req.url === "/" ? "/index.html" : req.url;
    filePath = path.join(__dirname, "../viewer", filePath);

    const ext = path.extname(filePath);
    const mimeTypes: Record<string, string> = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
    };

    fs.readFile(filePath, (err: any, data: any) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
      res.end(data);
    });
  });

  server.listen(PORT, () => {
    console.log(`[Server] MOM TV viewer running on http://localhost:${PORT}`);
  });
}

// ── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  📺 MOM TV — Video Indexer + Foundry Pipeline ║");
  console.log("╚══════════════════════════════════════════════╝");

  // Initialize analytics store
  await analyticsStore.initialize();

  // Start HTTP server
  startServer();

  // Start pipeline loop (non-blocking)
  runPipeline().catch(console.error);
}

main();