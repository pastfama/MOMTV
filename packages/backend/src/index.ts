// ============================================================
// MOMTV Backend - Main Entry Point
// ============================================================
// Starts the pipeline orchestrator and WebSocket server
// for the browser-based studio to connect to.
// ============================================================

import express from "express";
import cors from "cors";
import { WebSocketServer, type WebSocket } from "ws";
import { createServer } from "http";
import { loadConfig } from "./config/index.js";
import { Orchestrator } from "./pipeline/orchestrator.js";
import { EventBus, eventBus } from "./events/event-bus.js";
import type { StudioEvent } from "@momtv/shared";

const PORT = parseInt(process.env["PORT"] ?? "3001", 10);

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║       🎬 MOMTV - AI TV Studio 🎬         ║");
  console.log("║  Powered by Azure AI Foundry             ║");
  console.log("╚══════════════════════════════════════════╝");

  // Load configuration
  const config = loadConfig();
  console.log(`[Main] Loaded config: ${config.streams.length} stream(s), ${config.agents.length} agent(s)`);

  // Create HTTP server for REST API + WebSocket
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      agents: config.agents.map((a) => ({ id: a.id, name: a.name, role: a.role })),
    });
  });

  // Agent list endpoint
  app.get("/api/agents", (_req, res) => {
    res.json(config.agents);
  });

  // Recent events endpoint
  app.get("/api/events", (_req, res) => {
    res.json(eventBus.getRecentEvents(50));
  });

  const server = createServer(app);

  // WebSocket server for studio connections
  const wss = new WebSocketServer({ server, path: "/ws" });
  const studioClients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    console.log("[WebSocket] Studio connected");
    studioClients.add(ws);

    // Send initial state sync
    ws.send(JSON.stringify({
      type: "state_sync",
      timestamp: Date.now(),
      data: {
        agents: config.agents.map((a) => ({
          id: a.id,
          name: a.name,
          role: a.role,
          character: a.character,
        })),
        studio: config.studio,
      },
    }));

    ws.on("close", () => {
      studioClients.delete(ws);
      console.log("[WebSocket] Studio disconnected");
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type: string; data?: unknown };
        console.log(`[WebSocket] Studio message: ${msg.type}`);
      } catch {
        // Ignore
      }
    });
  });

  // Forward all event bus events to WebSocket clients
  const eventTypes = [
    "scene_change",
    "agent_speak",
    "agent_move",
    "agent_emotion",
    "ticker_update",
    "banner_show",
    "banner_hide",
    "chat_highlight",
    "audio_level",
  ] as const;

  for (const eventType of eventTypes) {
    eventBus.on(eventType, (event: StudioEvent) => {
      const message = JSON.stringify(event);
      for (const client of studioClients) {
        if (client.readyState === 1) {
          client.send(message);
        }
      }
    });
  }

  // Start HTTP server
  server.listen(PORT, () => {
    console.log(`[Main] HTTP server listening on http://localhost:${PORT}`);
    console.log(`[Main] WebSocket available at ws://localhost:${PORT}/ws`);
    console.log(`[Main] Health check: http://localhost:${PORT}/health`);
  });

  // Start pipeline orchestrator
  const orchestrator = new Orchestrator(config);

  try {
    await orchestrator.start();
    console.log("[Main] Pipeline orchestrator started successfully");
  } catch (err) {
    console.error(`[Main] Failed to start orchestrator: ${err}`);
    console.log("[Main] Continuing without stream capture (API-only mode)");
  }

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n[Main] Shutting down...");
    orchestrator.stop();
    wss.close();
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("\n[Main] MOMTV is ready! Open the studio in your browser.");
  console.log("[Main] Press Ctrl+C to stop.\n");
}

main().catch((err) => {
  console.error(`[Main] Fatal error: ${err}`);
  process.exit(1);
});