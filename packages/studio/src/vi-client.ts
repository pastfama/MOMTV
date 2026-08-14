// ============================================================
// MOM TV — Video Indexer Client
// ============================================================
// Connects to the backend SSE endpoint to receive real-time
// Video Indexer analysis results (transcript, OCR, scenes, topics).
// ============================================================

import type { VideoIndexerInsights } from "@momtv/shared";
import { apiUrl } from "./api-config.js";

// ── Types ────────────────────────────────────────────────────

export type VIInsightsHandler = (insights: VideoIndexerInsights) => void;

// ── Video Indexer Client ─────────────────────────────────────

export class VIClient {
  private eventSource: EventSource | null = null;
  private handlers: VIInsightsHandler[] = [];
  private sseUrl: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private latestInsights: VideoIndexerInsights | null = null;

  constructor(sseUrl: string = apiUrl("/api/vi-stream")) {
    this.sseUrl = sseUrl;
  }

  // ── Public API ───────────────────────────────────────────

  onInsights(handler: VIInsightsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Connect to the Video Indexer SSE stream.
   */
  connect(): void {
    console.log(`[VIClient] Connecting to ${this.sseUrl}...`);

    try {
      this.eventSource = new EventSource(this.sseUrl);

      this.eventSource.onopen = () => {
        console.log("[VIClient] SSE connected");
      };

      this.eventSource.addEventListener("segment", (event) => {
        this.handleSegmentEvent(event as MessageEvent);
      });

      this.eventSource.onerror = () => {
        console.warn("[VIClient] SSE error, reconnecting in 10s...");
        this.disconnect();
        this.reconnectTimer = setTimeout(() => this.connect(), 10_000);
      };
    } catch (err) {
      console.warn("[VIClient] Connection failed:", err);
      this.reconnectTimer = setTimeout(() => this.connect(), 10_000);
    }
  }

  /**
   * Disconnect from the SSE stream.
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Get the latest insights received.
   */
  getLatest(): VideoIndexerInsights | null {
    return this.latestInsights;
  }

  // ── Event Handling ───────────────────────────────────────

  private handleSegmentEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as {
        timestamp?: number;
        segmentId?: string;
        transcript?: Array<{ text?: string }>;
        ocr?: Array<{ text?: string }>;
        scenes?: unknown[];
        topics?: Array<{ name?: string }>;
        summary?: string;
      };

      const insights: VideoIndexerInsights = {
        timestamp: data.timestamp ?? Date.now(),
        segmentId: data.segmentId ?? "unknown",
        transcript: (data.transcript ?? [])
          .map((t) => t.text ?? "")
          .filter(Boolean),
        ocrText: (data.ocr ?? [])
          .map((o) => o.text ?? "")
          .filter(Boolean),
        scenes: data.scenes?.length ?? 0,
        topics: (data.topics ?? [])
          .map((t) => t.name ?? "")
          .filter(Boolean),
        summary: data.summary,
      };

      this.latestInsights = insights;

      console.log(
        `[VIClient] Segment ${insights.segmentId}: ` +
        `${insights.transcript.length} transcript lines, ` +
        `${insights.ocrText.length} OCR items, ` +
        `${insights.scenes} scenes, ` +
        `${insights.topics.length} topics`,
      );

      // Notify handlers
      for (const handler of this.handlers) {
        try {
          handler(insights);
        } catch (err) {
          console.error("[VIClient] Handler error:", err);
        }
      }
    } catch (err) {
      console.warn("[VIClient] Failed to parse segment event:", err);
    }
  }
}