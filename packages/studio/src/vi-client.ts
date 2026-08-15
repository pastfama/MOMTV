// ============================================================
// MOM TV — Video Indexer Client
// ============================================================
// Polls the backend video-indexer function for analysis results.
// Falls back to Twitch thumbnail analysis when VI is unavailable.
// ============================================================

import type { VideoIndexerInsights } from "@momtv/shared";
import { apiUrl } from "./api-config.js";

// ── Types ────────────────────────────────────────────────────

export type VIInsightsHandler = (insights: VideoIndexerInsights) => void;

// ── Video Indexer Client ─────────────────────────────────────

export class VIClient {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private handlers: VIInsightsHandler[] = [];
  private viApiUrl: string;
  private latestInsights: VideoIndexerInsights | null = null;
  private lastPollTime = 0;
  private pollIntervalMs = 30_000; // Poll every 30s
  private isAvailable = false;

  constructor(viApiUrl: string = apiUrl("/api/video-indexer")) {
    this.viApiUrl = viApiUrl;
  }

  // ── Public API ───────────────────────────────────────────

  onInsights(handler: VIInsightsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Start polling for Video Indexer insights.
   */
  connect(): void {
    console.log(`[VIClient] Starting VI poll every ${this.pollIntervalMs / 1000}s`);

    // Initial poll
    this.pollInsights();

    // Periodic polling
    this.pollTimer = setInterval(() => this.pollInsights(), this.pollIntervalMs);
  }

  /**
   * Stop polling.
   */
  disconnect(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Get the latest insights received.
   */
  getLatest(): VideoIndexerInsights | null {
    return this.latestInsights;
  }

  /**
   * Check if VI is available.
   */
  isViAvailable(): boolean {
    return this.isAvailable;
  }

  // ── Polling ─────────────────────────────────────────────

  private async pollInsights(): Promise<void> {
    try {
      // Try to get latest video insights
      // For now, we use a simple approach: check if there are any recent videos
      // In production, this would query the VI API for the latest indexed video
      const response = await fetch(`${this.viApiUrl}/insights?videoId=latest`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 503) {
        // VI not configured
        if (this.isAvailable) {
          console.warn("[VIClient] VI unavailable — using fallback analysis");
          this.isAvailable = false;
        }
        return;
      }

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      this.isAvailable = true;

      if (data && data.transcript) {
        const insights: VideoIndexerInsights = {
          timestamp: Date.now(),
          segmentId: data.videoId || "unknown",
          transcript: (data.transcript || [])
            .map((t: { text?: string }) => t.text ?? "")
            .filter(Boolean),
          ocrText: (data.ocr || [])
            .map((o: { text?: string }) => o.text ?? "")
            .filter(Boolean),
          scenes: data.scenes?.length || 0,
          topics: (data.topics || [])
            .map((t: { name?: string }) => t.name ?? "")
            .filter(Boolean),
          summary: data.summary,
        };

        // Only emit if we have new data
        if (insights.transcript.length > 0 || insights.topics.length > 0) {
          this.latestInsights = insights;
          this.emitInsights(insights);
        }
      }
    } catch (err) {
      // VI endpoint might not exist yet — that's OK
      if (this.isAvailable) {
        console.warn("[VIClient] Poll failed:", err);
        this.isAvailable = false;
      }
    }
  }

  private emitInsights(insights: VideoIndexerInsights): void {
    console.log(
      `[VIClient] New insights: ` +
      `${insights.transcript.length} transcript, ` +
      `${insights.ocrText.length} OCR, ` +
      `${insights.scenes} scenes, ` +
      `${insights.topics.length} topics`,
    );

    for (const handler of this.handlers) {
      try {
        handler(insights);
      } catch (err) {
        console.error("[VIClient] Handler error:", err);
      }
    }
  }
}
