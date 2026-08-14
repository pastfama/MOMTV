// ============================================================
// MOM TV — Analytics Client
// ============================================================
// Batches analytics data in memory and sends to the backend
// API periodically. Falls back to localStorage when offline.
// ============================================================

import type { WatcherReport, StreamEvent, VideoIndexerInsights } from "@momtv/shared";

// ── Configuration ────────────────────────────────────────────

const API_BASE = "/api/analytics";
const FLUSH_INTERVAL_MS = 30_000; // Flush every 30 seconds
const MAX_BATCH_SIZE = 100; // Force flush at this size
const LS_KEY = "momtv-analytics-queue"; // localStorage fallback key

// ── Types ────────────────────────────────────────────────────

export type AnalyticsEventType =
  | "stream-event"
  | "watcher-report"
  | "chat-window"
  | "vi-insight"
  | "agent-output"
  | "viewer-sample"
  | "custom";

export interface AnalyticsRecord {
  type: AnalyticsEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

// ── Analytics Client ─────────────────────────────────────────

export class AnalyticsClient {
  private buffer: AnalyticsRecord[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private totalSent = 0;
  private totalFailed = 0;

  // ── Public API ───────────────────────────────────────────

  /**
   * Start the analytics client — begin periodic flushing.
   */
  start(): void {
    console.log("[AnalyticsClient] Starting analytics client");

    // Load any queued records from localStorage
    this.loadFromLocalStorage();

    // Periodic flush
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);

    // Flush on page unload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.flushSync();
      });
    }
  }

  /**
   * Stop the analytics client.
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushSync();
  }

  // ── Record Methods ───────────────────────────────────────

  /**
   * Record a stream event from the StreamWatcher.
   */
  recordStreamEvent(event: StreamEvent): void {
    this.add({
      type: "stream-event",
      timestamp: event.timestamp,
      data: {
        eventType: event.type,
        description: event.description,
        severity: event.severity,
        metadata: event.metadata,
      },
    });
  }

  /**
   * Record a watcher report.
   */
  recordWatcherReport(report: WatcherReport): void {
    this.add({
      type: "watcher-report",
      timestamp: Date.now(),
      data: {
        alertLevel: report.alert_level,
        summary: report.summary,
        notableEvents: report.notable_events,
        viewerEngagement: report.viewer_engagement,
        streamerBehavior: report.streamer_behavior,
        gameDetected: report.game_detected,
        viewerCount: report.viewer_count,
        isLive: report.is_live,
        chatMetrics: report.chat_metrics,
      },
    });
  }

  /**
   * Record chat window aggregation.
   */
  recordChatWindow(data: {
    messageCount: number;
    uniqueUsers: number;
    messagesPerMinute: number;
    topKeywords: string[];
    sentiment: string;
  }): void {
    this.add({
      type: "chat-window",
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Record Video Indexer insights.
   */
  recordVIInsights(insights: VideoIndexerInsights): void {
    this.add({
      type: "vi-insight",
      timestamp: insights.timestamp,
      data: {
        segmentId: insights.segmentId,
        transcriptLines: insights.transcript.length,
        ocrItems: insights.ocrText.length,
        scenes: insights.scenes,
        topics: insights.topics,
        summary: insights.summary,
        // Store first few lines for later analysis
        transcriptPreview: insights.transcript.slice(0, 5),
        ocrPreview: insights.ocrText.slice(0, 5),
      },
    });
  }

  /**
   * Record an agent output.
   */
  recordAgentOutput(agent: string, content: string, timestamp: number): void {
    this.add({
      type: "agent-output",
      timestamp,
      data: {
        agent,
        contentLength: content.length,
        contentPreview: content.slice(0, 500),
      },
    });
  }

  /**
   * Record a viewer count sample.
   */
  recordViewerSample(viewerCount: number, game: string, isLive: boolean): void {
    this.add({
      type: "viewer-sample",
      timestamp: Date.now(),
      data: { viewerCount, game, isLive },
    });
  }

  /**
   * Record a custom event.
   */
  recordCustom(category: string, data: Record<string, unknown>): void {
    this.add({
      type: "custom",
      timestamp: Date.now(),
      data: { category, ...data },
    });
  }

  // ── Stats ────────────────────────────────────────────────

  getStats(): { buffered: number; sent: number; failed: number } {
    return {
      buffered: this.buffer.length,
      sent: this.totalSent,
      failed: this.totalFailed,
    };
  }

  // ── Internal ─────────────────────────────────────────────

  private add(record: AnalyticsRecord): void {
    this.buffer.push(record);

    // Force flush if buffer is large
    if (this.buffer.length >= MAX_BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Flush buffered records to the backend API.
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) return;

    this.isFlushing = true;

    // Take all records from buffer
    const records = this.buffer.splice(0);

    try {
      const response = await fetch(`${API_BASE}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(records),
      });

      if (response.ok) {
        const result = (await response.json()) as { accepted?: number };
        this.totalSent += result.accepted ?? records.length;
        console.log(
          `[AnalyticsClient] Flushed ${records.length} records (total sent: ${this.totalSent})`,
        );
      } else {
        // Put records back and save to localStorage
        this.buffer.unshift(...records);
        this.saveToLocalStorage();
        this.totalFailed += records.length;
        console.warn(
          `[AnalyticsClient] Flush failed (${response.status}), ${records.length} records queued`,
        );
      }
    } catch {
      // Network error — save to localStorage for later
      this.buffer.unshift(...records);
      this.saveToLocalStorage();
      this.totalFailed += records.length;
      console.warn(
        `[AnalyticsClient] Flush error, ${records.length} records saved to localStorage`,
      );
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Synchronous flush using sendBeacon (for page unload).
   */
  private flushSync(): void {
    if (this.buffer.length === 0) return;

    const records = this.buffer.splice(0);

    try {
      const blob = new Blob([JSON.stringify(records)], {
        type: "application/json",
      });
      navigator.sendBeacon(`${API_BASE}/record`, blob);
      this.totalSent += records.length;
    } catch {
      // Save to localStorage as last resort
      this.saveToLocalStorage(records);
    }
  }

  // ── localStorage Fallback ────────────────────────────────

  private saveToLocalStorage(extra?: AnalyticsRecord[]): void {
    try {
      const existing = this.loadQueuedFromStorage();
      const combined = [...existing, ...(extra || []), ...this.buffer];

      // Keep only last 1000 records in localStorage to avoid quota issues
      const trimmed = combined.slice(-1000);
      localStorage.setItem(LS_KEY, JSON.stringify(trimmed));

      console.log(
        `[AnalyticsClient] Saved ${trimmed.length} records to localStorage`,
      );
    } catch {
      // localStorage full — discard oldest
      console.warn("[AnalyticsClient] localStorage full, discarding old records");
    }
  }

  private loadFromLocalStorage(): void {
    const queued = this.loadQueuedFromStorage();
    if (queued.length > 0) {
      this.buffer.push(...queued);
      localStorage.removeItem(LS_KEY);
      console.log(
        `[AnalyticsClient] Loaded ${queued.length} queued records from localStorage`,
      );
    }
  }

  private loadQueuedFromStorage(): AnalyticsRecord[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as AnalyticsRecord[];
    } catch {
      return [];
    }
  }
}