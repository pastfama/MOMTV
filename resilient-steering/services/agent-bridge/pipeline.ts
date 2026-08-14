// ============================================================
// MOMTV — Pipeline Orchestrator
// ============================================================
// Connects stream capture → Video Indexer → Foundry agents → show output.
// Runs as a continuous loop: capture segment, analyze, generate show.
// ============================================================

import { BlobServiceClient } from "@azure/storage-blob";
import {
  analyzeSegment,
  type VideoIndexResult,
} from "../video-indexer/indexer-client.js";
import { captureSegment } from "../stream-capture/hls-capture.js";

// ── Configuration ──────────────────────────────────────────────

const AZURE_STORAGE_CONNECTION =
  process.env.AZURE_STORAGE_CONNECTION || "";
const PROJECT_ENDPOINT =
  process.env.FOUNDRY_PROJECT_ENDPOINT ||
  "https://cog-cdwzd6d3oc77y.services.ai.azure.com/api/projects/resilient-steering-dev";
const TWITCH_CHANNEL = process.env.TWITCH_CHANNEL || "KNIG04Ei";
const TWITCH_PLATFORM = process.env.TWITCH_PLATFORM || "twitch";

const CAPTURE_INTERVAL_MS = 30_000; // 30 seconds
const AGENT_POLL_INTERVAL_MS = 10_000; // 10 seconds

// ── Types ──────────────────────────────────────────────────────

export interface ShowSegment {
  timestamp: number;
  channel: string;
  videoAnalysis: VideoIndexResult;
  agentOutput: AgentOutput | null;
}

export interface AgentOutput {
  agent: string;
  content: string;
  timestamp: number;
}

// ── Foundry Agent Client ──────────────────────────────────────

async function invokeFoundryAgent(
  agentName: string,
  input: string,
  previousResponseId?: string,
): Promise<{ id: string; output?: string }> {
  const endpoint = `${PROJECT_ENDPOINT}/agents/${agentName}/endpoint/protocols/openai/responses?api-version=v1`;

  const body: Record<string, unknown> = {
    model: "agent",
    input,
    store: true,
    background: true,
  };

  if (previousResponseId) {
    body.previous_response_id = previousResponseId;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Agent ${agentName} invocation failed (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    id: string;
    status?: string;
    output?: Array<{
      type: string;
      content?: Array<{ type: string; text?: string }>;
    }>;
  };

  // Extract text from immediate response
  let text = "";
  if (data.output) {
    for (const item of data.output) {
      if (item.type === "message" && item.content) {
        for (const content of item.content) {
          if (content.type === "output_text" && content.text) {
            text += content.text;
          }
        }
      }
    }
  }

  return { id: data.id, output: text };
}

// ── Poll for Background Response ──────────────────────────────

async function pollAgentResponse(
  agentName: string,
  responseId: string,
  maxWaitMs: number = 60_000,
): Promise<string> {
  const endpoint = `${PROJECT_ENDPOINT}/agents/${agentName}/endpoint/protocols/openai/responses?api-version=v1`;
  const pollUrl = `${endpoint.split("?")[0]}/${responseId}`;

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, AGENT_POLL_INTERVAL_MS));

    try {
      const response = await fetch(pollUrl);
      if (!response.ok) continue;

      const data = (await response.json()) as {
        status?: string;
        output?: Array<{
          type: string;
          content?: Array<{ type: string; text?: string }>;
        }>;
      };

      if (data.status === "completed" || data.status === "succeeded") {
        // Extract text
        let text = "";
        for (const item of data.output || []) {
          if (item.type === "message" && item.content) {
            for (const content of item.content) {
              if (content.type === "output_text" && content.text) {
                text += content.text;
              }
            }
          }
        }
        return text;
      }

      if (data.status === "failed" || data.status === "cancelled") {
        throw new Error(`Agent ${agentName} response ${data.status}`);
      }
    } catch {
      // Continue polling
    }
  }

  throw new Error(`Agent ${agentName} response timed out`);
}

// ── Format Video Analysis for Agents ──────────────────────────

function formatAnalysisForAgent(analysis: VideoIndexResult): string {
  const parts: string[] = [];

  if (analysis.transcript && analysis.transcript.length > 0) {
    const transcriptText = analysis.transcript
      .map((t) => t.text)
      .join(" ");
    parts.push(`Transcript: ${transcriptText}`);
  }

  if (analysis.ocr && analysis.ocr.length > 0) {
    const ocrText = analysis.ocr.map((o) => o.text).join(", ");
    parts.push(`On-screen text: ${ocrText}`);
  }

  if (analysis.scenes && analysis.scenes.length > 0) {
    parts.push(`Scenes detected: ${analysis.scenes.length}`);
  }

  if (analysis.topics && analysis.topics.length > 0) {
    const topicText = analysis.topics
      .map((t) => `${t.name} (${(t.confidence * 100).toFixed(0)}%)`)
      .join(", ");
    parts.push(`Topics: ${topicText}`);
  }

  return parts.join("\n");
}

// ── Run Analysis Pipeline ─────────────────────────────────────

export async function runAnalysisPipeline(): Promise<ShowSegment | null> {
  console.log(`[Pipeline] Starting analysis for ${TWITCH_CHANNEL}`);

  // 1. Capture stream segment
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    AZURE_STORAGE_CONNECTION,
  );

  const captureResult = await captureSegment(blobServiceClient);
  if (!captureResult) {
    console.warn("[Pipeline] No segment captured");
    return null;
  }

  console.log(`[Pipeline] Segment captured: ${captureResult.segmentId}`);

  // 2. Analyze with Video Indexer
  let videoAnalysis: VideoIndexResult;
  try {
    videoAnalysis = await analyzeSegment(
      captureResult.blobUrl,
      captureResult.segmentId,
    );
  } catch (error) {
    console.error("[Pipeline] Video Indexer analysis failed:", error);
    return null;
  }

  console.log("[Pipeline] Video analysis complete");

  // 3. Send to Foundry agents
  const analysisText = formatAnalysisForAgent(videoAnalysis);

  let agentOutput: AgentOutput | null = null;
  try {
    // Invoke show-producer with video analysis
    const input = `Stream segment analysis for ${TWITCH_CHANNEL} on ${TWITCH_PLATFORM}:\n\n${analysisText}\n\nGenerate an anchor script for Alex and Sasha based on this analysis. Output valid JSON.`;

    const { id, output } = await invokeFoundryAgent("show-producer", input);

    if (output) {
      agentOutput = {
        agent: "show-producer",
        content: output,
        timestamp: Date.now(),
      };
    } else {
      // Poll for background response
      const text = await pollAgentResponse("show-producer", id);
      agentOutput = {
        agent: "show-producer",
        content: text,
        timestamp: Date.now(),
      };
    }
  } catch (error) {
    console.error("[Pipeline] Agent invocation failed:", error);
  }

  // 4. Return combined result
  const segment: ShowSegment = {
    timestamp: Date.now(),
    channel: TWITCH_CHANNEL,
    videoAnalysis,
    agentOutput,
  };

  console.log("[Pipeline] Segment complete:", {
    videoId: videoAnalysis.videoId,
    transcriptLines: videoAnalysis.transcript?.length || 0,
    hasAgentOutput: !!agentOutput,
  });

  return segment;
}

// ── Main Pipeline Loop ────────────────────────────────────────

export async function startPipelineLoop(): Promise<void> {
  console.log(
    `[Pipeline] Starting continuous pipeline for ${TWITCH_CHANNEL} (every ${CAPTURE_INTERVAL_MS / 1000}s)`,
  );

  while (true) {
    try {
      await runAnalysisPipeline();
    } catch (error) {
      console.error("[Pipeline] Pipeline iteration failed:", error);
    }

    // Wait for next iteration
    await new Promise((resolve) => setTimeout(resolve, CAPTURE_INTERVAL_MS));
  }
}