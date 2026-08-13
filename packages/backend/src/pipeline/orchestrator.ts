// ============================================================
// MOMTV Backend - Pipeline Orchestrator
// ============================================================
// The central nervous system of MOMTV. Connects:
// Stream Capture → AI Analysis → Decision Engine → Commentary → TTS → Studio
// ============================================================

import type {
  MOMTVConfig,
  StreamConfig,
  StreamContext,
  VideoFrame,
  ChatMessage,
  AudioSegment,
  InterestingEvent,
  CommentarySegment,
  Agent,
  LanguageCode,
} from "@momtv/shared";
import { v4 as uuid } from "uuid";
import { FoundryClient } from "../ai/foundry-client.js";
import { StreamCapture } from "../ingestion/stream-capture.js";
import { ChatMonitor } from "../ingestion/chat-monitor.js";
import { SpeechSynthesizer } from "../tts/speech-synthesizer.js";
import { EventBus, eventBus } from "../events/event-bus.js";
import {
  createAgentSpeakEvent,
  createSceneChangeEvent,
  createTickerUpdateEvent,
} from "@momtv/shared";

interface StreamPipeline {
  config: StreamConfig;
  capture: StreamCapture;
  chat: ChatMonitor;
  context: StreamContext;
}

export class Orchestrator {
  private config: MOMTVConfig;
  private foundry: FoundryClient;
  private tts: SpeechSynthesizer;
  private pipelines: Map<string, StreamPipeline> = new Map();
  private isRunning = false;
  private analysisIntervals: ReturnType<typeof setInterval>[] = [];

  constructor(config: MOMTVConfig) {
    this.config = config;
    this.foundry = new FoundryClient(config.foundry);
    this.tts = new SpeechSynthesizer(config.tts.subscriptionKey, config.tts.region);
  }

  async start(): Promise<void> {
    console.log("[Orchestrator] Starting MOMTV pipeline...");
    this.isRunning = true;

    await this.tts.init();

    // Start each stream pipeline
    for (const streamConfig of this.config.streams) {
      await this.startStreamPipeline(streamConfig);
    }

    console.log(`[Orchestrator] All ${this.config.streams.length} stream pipeline(s) started`);
  }

  stop(): void {
    console.log("[Orchestrator] Stopping all pipelines...");
    this.isRunning = false;

    for (const [id, pipeline] of this.pipelines) {
      pipeline.capture.stop();
      pipeline.chat.stop();
      console.log(`[Orchestrator] Stopped pipeline: ${id}`);
    }

    for (const interval of this.analysisIntervals) {
      clearInterval(interval);
    }
    this.analysisIntervals = [];
  }

  // --- Stream Pipeline Setup ---

  private async startStreamPipeline(streamConfig: StreamConfig): Promise<void> {
    console.log(`[Orchestrator] Setting up pipeline for: ${streamConfig.name}`);

    const initialContext: StreamContext = {
      streamId: streamConfig.id,
      timestamp: Date.now(),
      frameAnalysis: null,
      recentAudio: [],
      chatSummary: {
        streamId: streamConfig.id,
        windowStart: new Date(),
        windowEnd: new Date(),
        messageCount: 0,
        uniqueUsers: 0,
        topKeywords: [],
        sentiment: "neutral",
        hypeLevel: 0,
        notableMessages: [],
      },
      recentEvents: [],
    };

    // Create chat monitor
    const chat = new ChatMonitor(streamConfig, {
      onMessage: (msg) => this.handleChatMessage(streamConfig.id, msg),
      onConnect: (platform) => {
        console.log(`[Orchestrator] Chat connected: ${platform}`);
      },
      onDisconnect: (platform) => {
        console.log(`[Orchestrator] Chat disconnected: ${platform}`);
      },
      onError: (err) => {
        console.error(`[Orchestrator] Chat error: ${err.message}`);
      },
    });

    // Create stream capture
    const capture = new StreamCapture(streamConfig);
    capture.onFrame((frame) => this.handleFrame(streamConfig.id, frame));

    const pipeline: StreamPipeline = {
      config: streamConfig,
      capture,
      chat,
      context: initialContext,
    };

    this.pipelines.set(streamConfig.id, pipeline);

    // Start capture and chat
    await capture.start();
    await chat.start();

    // Start periodic analysis cycle (every 10 seconds)
    const analysisInterval = setInterval(
      () => this.runAnalysisCycle(streamConfig.id),
      10_000,
    );
    this.analysisIntervals.push(analysisInterval);

    // Start chat buffer processing (every 30 seconds)
    chat.onBufferFull((messages) => this.processChatBuffer(streamConfig.id, messages));
  }

  // --- Frame Handling ---

  private async handleFrame(streamId: string, frame: VideoFrame): Promise<void> {
    const pipeline = this.pipelines.get(streamId);
    if (!pipeline) return;

    try {
      const contextSummary = this.buildContextSummary(pipeline.context);
      const analysis = await this.foundry.analyzeFrame(
        frame.imageBase64,
        contextSummary,
        pipeline.config.language,
      );
      analysis.streamId = streamId;

      pipeline.context.frameAnalysis = analysis;
      pipeline.context.timestamp = Date.now();

      // Check if frame is interesting enough to note
      if (analysis.interestingnessScore > 0.5) {
        const event: InterestingEvent = {
          id: uuid(),
          streamId,
          timestamp: Date.now(),
          type: this.classifyEvent(analysis),
          severity: analysis.interestingnessScore,
          description: analysis.description,
          context: analysis.onScreenText,
          suggestedReaction: analysis.detectedActivity,
        };
        pipeline.context.recentEvents.push(event);

        // Keep only last 20 events
        if (pipeline.context.recentEvents.length > 20) {
          pipeline.context.recentEvents = pipeline.context.recentEvents.slice(-20);
        }
      }
    } catch (err) {
      console.error(`[Orchestrator] Frame analysis error: ${err}`);
    }
  }

  // --- Chat Handling ---

  private handleChatMessage(streamId: string, msg: ChatMessage): void {
    const pipeline = this.pipelines.get(streamId);
    if (!pipeline) return;

    // Update chat summary
    const summary = pipeline.context.chatSummary;
    summary.messageCount++;
    summary.windowEnd = new Date();
  }

  private async processChatBuffer(streamId: string, messages: ChatMessage[]): Promise<void> {
    const pipeline = this.pipelines.get(streamId);
    if (!pipeline) return;

    try {
      const msgTexts = messages.map((m) => `${m.username}: ${m.message}`);
      const analysis = await this.foundry.analyzeChat(
        msgTexts,
        pipeline.config.language,
      );

      pipeline.context.chatSummary = {
        streamId,
        windowStart: new Date(Date.now() - 30_000),
        windowEnd: new Date(),
        messageCount: messages.length,
        uniqueUsers: new Set(messages.map((m) => m.username)).size,
        topKeywords: analysis.topKeywords,
        sentiment: analysis.sentiment,
        hypeLevel: analysis.hypeLevel,
        notableMessages: messages.slice(-5),
      };

      // High hype = interesting
      if (analysis.hypeLevel > 0.7) {
        const event: InterestingEvent = {
          id: uuid(),
          streamId,
          timestamp: Date.now(),
          type: "reaction",
          severity: analysis.hypeLevel,
          description: `Chat hype detected: ${analysis.topKeywords.join(", ")}`,
          context: analysis.notableMessages.join(" | "),
          suggestedReaction: "react",
        };
        pipeline.context.recentEvents.push(event);
      }
    } catch (err) {
      console.error(`[Orchestrator] Chat analysis error: ${err}`);
    }
  }

  // --- Analysis Cycle ---

  private async runAnalysisCycle(streamId: string): Promise<void> {
    const pipeline = this.pipelines.get(streamId);
    if (!pipeline || !this.isRunning) return;

    try {
      const contextSummary = this.buildContextSummary(pipeline.context);
      const decision = await this.foundry.decide(contextSummary, pipeline.config.language);

      if (decision.action !== "wait" && decision.confidence > 0.5) {
        console.log(`[Orchestrator] Decision: ${decision.action} (${decision.confidence.toFixed(2)}) - ${decision.reason}`);

        await this.executeDecision(streamId, decision);
      }
    } catch (err) {
      console.error(`[Orchestrator] Analysis cycle error: ${err}`);
    }
  }

  // --- Decision Execution ---

  private async executeDecision(
    streamId: string,
    decision: { action: string; confidence: number; reason: string; targetAgentId?: string; priority: number },
  ): Promise<void> {
    const pipeline = this.pipelines.get(streamId);
    if (!pipeline) return;

    const targetAgentId = decision.targetAgentId ?? "alex";
    const agent = this.config.agents.find((a) => a.id === targetAgentId);
    if (!agent) return;

    // Determine which language to use
    const language: LanguageCode = pipeline.config.language;

    try {
      const contextSummary = this.buildContextSummary(pipeline.context);
      const trigger = decision.reason;

      // Generate commentary
      const commentary = await this.foundry.generateCommentary(
        agent.id,
        agent.name,
        agent.role,
        agent.personality.tone,
        contextSummary,
        trigger,
        language,
      );

      // Synthesize speech
      const ttsResult = await this.tts.synthesize(commentary.text, agent, language);

      // Create commentary segment
      const segment: CommentarySegment = {
        id: uuid(),
        agentId: agent.id,
        text: commentary.text,
        language,
        emotion: commentary.emotion,
        action: commentary.action as CommentarySegment["action"],
        timestamp: Date.now(),
        duration: ttsResult.duration,
        ttsAudioUrl: ttsResult.audioPath,
      };

      // Emit studio event
      const speakEvent = createAgentSpeakEvent(
        agent.id,
        commentary.text,
        language,
        commentary.emotion,
        ttsResult.audioPath,
        ttsResult.duration,
      );
      eventBus.emit("agent_speak", speakEvent);

      // Update scene for breaking news
      if (decision.action === "breaking_news") {
        const sceneEvent = createSceneChangeEvent({
          type: "breaking_news",
          title: "BREAKING NEWS",
          subtitle: pipeline.context.frameAnalysis?.description ?? "",
          activeAgents: [agent.id],
          background: "breaking_news",
          overlays: [
            { type: "banner", visible: true, content: "BREAKING NEWS", position: { x: 0.5, y: 0.2 } },
            { type: "ticker", visible: true, content: commentary.text, position: { x: 0.5, y: 0.95 } },
          ],
        });
        eventBus.emit("scene_change", sceneEvent);
      }

      // Update ticker
      const tickerEvent = createTickerUpdateEvent(
        `${agent.name}: ${commentary.text}`,
        language,
      );
      eventBus.emit("ticker_update", tickerEvent);

      console.log(`[Orchestrator] Commentary: [${agent.name}] ${commentary.text.slice(0, 80)}...`);
    } catch (err) {
      console.error(`[Orchestrator] Decision execution error: ${err}`);
    }
  }

  // --- Helpers ---

  private buildContextSummary(context: StreamContext): string {
    const parts: string[] = [];

    if (context.frameAnalysis) {
      parts.push(`Visual: ${context.frameAnalysis.description}`);
      parts.push(`On-screen text: ${context.frameAnalysis.onScreenText}`);
      parts.push(`Activity: ${context.frameAnalysis.detectedActivity}`);
      parts.push(`Emotion: ${context.frameAnalysis.detectedEmotion}`);
      parts.push(`Interestingness: ${context.frameAnalysis.interestingnessScore.toFixed(2)}`);
    }

    if (context.chatSummary.messageCount > 0) {
      parts.push(`Chat: ${context.chatSummary.messageCount} messages, sentiment=${context.chatSummary.sentiment}, hype=${context.chatSummary.hypeLevel.toFixed(2)}`);
      if (context.chatSummary.topKeywords.length > 0) {
        parts.push(`Keywords: ${context.chatSummary.topKeywords.join(", ")}`);
      }
    }

    if (context.recentEvents.length > 0) {
      const recent = context.recentEvents.slice(-3);
      parts.push(`Recent events: ${recent.map((e) => `${e.type}: ${e.description}`).join("; ")}`);
    }

    return parts.join("\n") || "No data available yet.";
  }

  private classifyEvent(analysis: { tags: string[]; interestingnessScore: number }): "highlight" | "clip" | "reaction" | "breaking" | "discussion" | "funny" {
    const tags = analysis.tags.map((t) => t.toLowerCase());
    if (tags.some((t) => ["win", "victory", "champion", "mvp"].includes(t))) return "highlight";
    if (tags.some((t) => ["fail", "death", "game over", "rage"].includes(t))) return "funny";
    if (tags.some((t) => ["breaking", "news", "update", "announcement"].includes(t))) return "breaking";
    if (analysis.interestingnessScore > 0.8) return "highlight";
    return "discussion";
  }
}