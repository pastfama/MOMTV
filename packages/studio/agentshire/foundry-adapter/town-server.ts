// ============================================================
// MOMTV Town Server
// ============================================================
// Standalone Node.js server that:
// 1. Serves the pre-built Agentshire 3D town frontend
// 2. Runs a WebSocket server broadcasting AgentEvents
// 3. Polls the MOMTV simulation API for state updates
// 4. Maps WorldState/Transactions → AgentEvents via the Foundry adapter
//
// Usage:
//   node town-server.ts
//   Town opens at http://localhost:55210
//   WS bridge at ws://localhost:55211
//
// Environment variables:
//   TOWN_PORT        — HTTP port (default 55210)
//   WS_PORT          — WebSocket port (default 55211)
//   SIMULATION_URL   — MOMTV simulation API URL
//   FOUNDRY_ENDPOINT — Foundry project endpoint for soul mode
//   FOUNDRY_API_KEY  — Foundry API key for soul mode
// ============================================================

import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname, resolve } from "path";
import { fileURLToPath } from "url";
import type {
  AgentEvent,
} from "../src/contracts/events.js";

// ── Config ────────────────────────────────────────────────────

const TOWN_PORT = parseInt(process.env.TOWN_PORT || "55210", 10);
const WS_PORT = parseInt(process.env.WS_PORT || "55211", 10);
const SIMULATION_URL = process.env.SIMULATION_URL || "http://localhost:7071/api/simulation";
const FOUNDRY_ENDPOINT = process.env.FOUNDRY_ENDPOINT || "";
const FOUNDRY_API_KEY = process.env.FOUNDRY_API_KEY || "";

// ── MIME types ────────────────────────────────────────────────

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".svg": "image/svg+xml",
};

// ── Frontend directory ────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FRONTEND_DIR = join(__dirname, "..", "town-frontend", "dist");

// ── State ─────────────────────────────────────────────────────

let lastPollTime = 0;
const POLL_INTERVAL_MS = 10_000; // poll simulation every 10s
let previousEventCount = 0;
let previousTxCount = 0;

// ── HTTP Server (serves town frontend) ────────────────────────

const httpServer = createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve static files from town-frontend/dist
  const filePath = join(
    FRONTEND_DIR,
    req.url === "/" ? "/index.html" : req.url!,
  );

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    readFileSync(filePath);
    const stream = require("fs").createReadStream(filePath);
    stream.pipe(res);
  } else {
    // SPA fallback — serve index.html for routes
    const indexPath = join(FRONTEND_DIR, "index.html");
    if (existsSync(indexPath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      const stream = require("fs").createReadStream(indexPath);
      stream.pipe(res);
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  }
});

httpServer.listen(TOWN_PORT, () => {
  console.log(`[MomtvTown] HTTP server: http://localhost:${TOWN_PORT}`);
});

// ── WebSocket Server (broadcasts AgentEvents) ─────────────────

const wss = new WebSocketServer({ port: WS_PORT });
const clients = new Set<WebSocket>();

console.log(`[MomtvTown] WebSocket server: ws://localhost:${WS_PORT}`);

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`[MomtvTown] Client connected (${clients.size} total)`);

  // Send system init
  ws.send(JSON.stringify({
    type: "agent_event",
    event: {
      type: "system",
      subtype: "init",
      sessionId: `momtv-${Date.now()}`,
      model: "gpt-4o",
      persona: "MOMTV World — AI-powered TV network about streamers",
    },
  }));

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[MomtvTown] Client disconnected (${clients.size} remaining)`);
  });
});

function broadcastEvent(event: AgentEvent): void {
  if (clients.size === 0) return;
  const payload = JSON.stringify({ type: "agent_event", event });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// ── Simulation Poller ─────────────────────────────────────────

async function pollSimulation(): Promise<void> {
  try {
    const now = Date.now();
    if (now - lastPollTime < POLL_INTERVAL_MS) return;
    lastPollTime = now;

    // Fetch world state
    const stateResp = await fetch(`${SIMULATION_URL}/state`);
    if (!stateResp.ok) return;

    const state = await stateResp.json();
    const events = state.events || [];
    const txns = state.recentTransactions || [];

    // Map new events
    for (const ev of events.slice(previousEventCount)) {
      broadcastEvent(mapWorldEvent(ev));
    }
    previousEventCount = events.length;

    // Map new transactions
    for (const tx of txns.slice(previousTxCount)) {
      broadcastEvent(mapTransaction(tx));
    }
    previousTxCount = txns.length;

    // Update world time
    broadcastEvent({
      type: "world_control",
      target: "time",
      action: "set",
      hour: new Date().getHours(),
    });

  } catch (err) {
    // Simulation API might not be running yet — that's OK
  }
}

function mapWorldEvent(ev: Record<string, unknown>): AgentEvent {
  const type = String(ev.type ?? "debug");
  const description = String(ev.description ?? "");

  switch (type) {
    case "stream_live":
      return { type: "text", content: `🔴 LIVE — ${description}` };
    case "stream_offline":
      return { type: "text", content: `⚫ Offline — ${description}` };
    case "viewer_spike":
      return { type: "text", content: `📈 ${description}` };
    case "chat_surge":
      return { type: "text", content: `💬 ${description}` };
    case "game_change":
      return { type: "text", content: `🎮 ${description}` };
    default:
      return { type: "debug", category: type, message: description };
  }
}

function mapTransaction(tx: Record<string, unknown>): AgentEvent {
  const txType = String(tx.type ?? "unknown");
  const payload = (tx.payload ?? {}) as Record<string, unknown>;
  const dialogue = String(payload.dialogue ?? "");

  if (dialogue && (txType === "speak" || txType === "pitch")) {
    return { type: "text", content: dialogue };
  }
  if (txType === "share_intel" && dialogue) {
    return { type: "text", content: dialogue };
  }
  return { type: "debug", category: "transaction", message: txType };
}

// ── Main loop ─────────────────────────────────────────────────

setInterval(pollSimulation, POLL_INTERVAL_MS);

console.log("[MomtvTown] Town server started — waiting for simulation data");

// ── Graceful shutdown ─────────────────────────────────────────

process.on("SIGINT", () => {
  console.log("[MomtvTown] Shutting down...");
  for (const ws of clients) ws.close();
  wss.close();
  httpServer.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.exit(0);
});