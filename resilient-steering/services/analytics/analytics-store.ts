// ============================================================
// MOMTV — Analytics Store
// ============================================================
// Buffers analytics data in memory and flushes to Azure Blob Storage
// as JSONL (JSON Lines) files organized by type and date.
// Supports GB-scale accumulation over time.
// ============================================================

import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

// ── Configuration ──────────────────────────────────────────────

const AZURE_STORAGE_CONNECTION =
  process.env.AZURE_STORAGE_CONNECTION || "";
const ANALYTICS_CONTAINER = "analytics";
const FLUSH_INTERVAL_MS = 60_000; // Flush every 60 seconds
const MAX_BUFFER_SIZE = 500; // Force flush if buffer exceeds this

// ── Types ──────────────────────────────────────────────────────

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

interface AnalyticsBuffer {
  records: AnalyticsRecord[];
  lastFlush: number;
}

// ── Analytics Store ────────────────────────────────────────────

export class AnalyticsStore {
  private containerClient: ContainerClient | null = null;
  private buffers: Map<AnalyticsEventType, AnalyticsBuffer> = new Map();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  // Stats
  private totalRecordsWritten = 0;
  private totalBytesWritten = 0;

  // ── Initialization ─────────────────────────────────────────

  /**
   * Initialize the store with an Azure Blob Storage connection.
   * Creates the analytics container if it doesn't exist.
   */
  async initialize(): Promise<void> {
    if (!AZURE_STORAGE_CONNECTION) {
      console.warn(
        "[AnalyticsStore] No AZURE_STORAGE_CONNECTION — analytics will be in-memory only",
      );
      return;
    }

    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        AZURE_STORAGE_CONNECTION,
      );
      this.containerClient =
        blobServiceClient.getContainerClient(ANALYTICS_CONTAINER);

      // Create container if it doesn't exist (private access)
      await this.containerClient.createIfNotExists({
        access: "container",
      });

      this.isInitialized = true;
      console.log(
        `[AnalyticsStore] Initialized — container: ${ANALYTICS_CONTAINER}`,
      );

      // Start periodic flush
      this.flushTimer = setInterval(
        () => this.flushAll(),
        FLUSH_INTERVAL_MS,
      );
    } catch (err) {
      console.error("[AnalyticsStore] Initialization failed:", err);
    }
  }

  // ── Write API ──────────────────────────────────────────────

  /**
   * Record a single analytics event.
   */
  record(type: AnalyticsEventType, data: Record<string, unknown>): void {
    const record: AnalyticsRecord = {
      type,
      timestamp: Date.now(),
      data,
    };

    this.addToBuffer(record);

    // Force flush if buffer is large
    const buffer = this.buffers.get(type);
    if (buffer && buffer.records.length >= MAX_BUFFER_SIZE) {
      this.flushType(type).catch((err) =>
        console.error(`[AnalyticsStore] Flush failed for ${type}:`, err),
      );
    }
  }

  /**
   * Record a batch of analytics events.
   */
  recordBatch(records: AnalyticsRecord[]): void {
    for (const record of records) {
      this.addToBuffer(record);
    }
  }

  /**
   * Get storage stats.
   */
  getStats(): {
    isInitialized: boolean;
    totalRecords: number;
    totalBytes: number;
    bufferSizes: Record<string, number>;
  } {
    const bufferSizes: Record<string, number> = {};
    for (const [type, buffer] of this.buffers) {
      bufferSizes[type] = buffer.records.length;
    }

    return {
      isInitialized: this.isInitialized,
      totalRecords: this.totalRecordsWritten,
      totalBytes: this.totalBytesWritten,
      bufferSizes,
    };
  }

  /**
   * Force flush all buffers to storage.
   */
  async flush(): Promise<void> {
    await this.flushAll();
  }

  /**
   * Read analytics data for a given type and date range.
   */
  async query(
    type: AnalyticsEventType,
    fromDate: Date,
    toDate: Date,
  ): Promise<AnalyticsRecord[]> {
    if (!this.containerClient) return [];

    const records: AnalyticsRecord[] = [];

    try {
      // List blobs matching the type and date range
      const prefix = `${type}/`;
      const fromDateStr = this.formatDatePath(fromDate);
      const toDateStr = this.formatDatePath(toDate);

      for await (const blob of this.containerClient.listBlobsFlat({
        prefix,
      })) {
        // Extract date from blob name: type/YYYY/MM/DD/type-HH-MM.jsonl
        const dateMatch = blob.name.match(
          /\/(\d{4})\/(\d{2})\/(\d{2})\//,
        );
        if (!dateMatch) continue;

        const blobDate = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
        if (blobDate < fromDateStr || blobDate > toDateStr) continue;

        // Download and parse the blob
        const blobClient = this.containerClient.getBlobClient(blob.name);
        const response = await blobClient.download();
        const content = await this.streamToString(response.readableStreamBody);

        for (const line of content.split("\n")) {
          if (!line.trim()) continue;
          try {
            records.push(JSON.parse(line) as AnalyticsRecord);
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (err) {
      console.error("[AnalyticsStore] Query failed:", err);
    }

    // Sort by timestamp
    records.sort((a, b) => a.timestamp - b.timestamp);

    // Filter by exact date range
    const fromTime = fromDate.getTime();
    const toTime = toDate.getTime();
    return records.filter((r) => r.timestamp >= fromTime && r.timestamp <= toTime);
  }

  /**
   * Get summary statistics for the last N hours.
   */
  async getSummary(
    hoursBack: number = 24,
  ): Promise<Record<string, { count: number; latestTimestamp: number }>> {
    const fromDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const toDate = new Date();
    const summary: Record<string, { count: number; latestTimestamp: number }> =
      {};

    const types: AnalyticsEventType[] = [
      "stream-event",
      "watcher-report",
      "chat-window",
      "vi-insight",
      "agent-output",
      "viewer-sample",
    ];

    for (const type of types) {
      const records = await this.query(type, fromDate, toDate);
      if (records.length > 0) {
        summary[type] = {
          count: records.length,
          latestTimestamp: records[records.length - 1].timestamp,
        };
      } else {
        summary[type] = { count: 0, latestTimestamp: 0 };
      }
    }

    return summary;
  }

  /**
   * Shutdown — flush remaining data and stop timers.
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushAll();
    console.log("[AnalyticsStore] Shutdown complete");
  }

  // ── Internal ───────────────────────────────────────────────

  private addToBuffer(record: AnalyticsRecord): void {
    const type = record.type;
    if (!this.buffers.has(type)) {
      this.buffers.set(type, { records: [], lastFlush: Date.now() });
    }
    this.buffers.get(type)!.records.push(record);
  }

  private async flushAll(): Promise<void> {
    const types = Array.from(this.buffers.keys());
    for (const type of types) {
      await this.flushType(type);
    }
  }

  private async flushType(type: AnalyticsEventType): Promise<void> {
    const buffer = this.buffers.get(type);
    if (!buffer || buffer.records.length === 0) return;
    if (!this.containerClient || !this.isInitialized) return;

    // Take records from buffer
    const records = buffer.records.splice(0);
    buffer.lastFlush = Date.now();

    if (records.length === 0) return;

    try {
      // Build blob path: type/YYYY/MM/DD/type-HH-MM-SS.jsonl
      const now = new Date();
      const datePath = this.formatDatePath(now);
      const timePart = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
      const blobName = `${type}/${datePath}/${type}-${timePart}.jsonl`;

      // Convert to JSONL
      const jsonl = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
      const buffer2 = Buffer.from(jsonl, "utf-8");

      // Upload
      const blockBlobClient =
        this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadData(buffer2, {
        blobHTTPHeaders: { blobContentType: "application/x-ndjson" },
      });

      this.totalRecordsWritten += records.length;
      this.totalBytesWritten += buffer2.length;

      console.log(
        `[AnalyticsStore] Flushed ${records.length} ${type} records (${(buffer2.length / 1024).toFixed(1)} KB) → ${blobName}`,
      );
    } catch (err) {
      console.error(`[AnalyticsStore] Failed to flush ${type}:`, err);
      // Put records back at the front of the buffer
      buffer.records.unshift(...records);
    }
  }

  private formatDatePath(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}/${m}/${d}`;
  }

  private async streamToString(
    stream: NodeJS.ReadableStream | null,
  ): Promise<string> {
    if (!stream) return "";
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }
}