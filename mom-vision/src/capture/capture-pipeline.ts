// ============================================================
// mom-vision — Capture Pipeline
// ============================================================
// Main orchestrator for OCR and audio capture
// ============================================================

import type { CaptureConfig, StreamState } from './types.js';
import { initLogger, logCapture, logChannelSwitch, logError, trackMetric } from '../logging/logger.js';
import { OcrWorker } from './ocr-worker.js';
import { AudioWorker } from './audio-worker.js';
import { StorageClient } from './storage-client.js';
import { HighlightManager } from './highlight-manager.js';
import { StatusTracker } from './stream-status.js';

const DEFAULT_CONFIG: CaptureConfig = {
  ocrIntervalMs: 5_000, // 5 seconds
  audioChunkSeconds: 30,
  storageRetentionDays: 30,
  currentChannel: '',
};

export class CapturePipeline {
  private ocrWorker: OcrWorker;
  private audioWorker: AudioWorker;
  private storage: StorageClient;
  private highlightManager: HighlightManager;
  private statusTracker: StatusTracker;
  private config: CaptureConfig;
  private timers: ReturnType<typeof setInterval>[] = [];
  private isRunning = false;
  private lastOcrTime = 0;
  private lastAudioTime = 0;
  private totalCaptures = 0;

  constructor(config?: Partial<CaptureConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ocrWorker = new OcrWorker();
    this.audioWorker = new AudioWorker();
    this.storage = new StorageClient();
    this.highlightManager = new HighlightManager(this.storage);
    this.statusTracker = new StatusTracker();
    
    // Initialize logger
    initLogger();
  }

  /**
   * Start capturing from a channel
   */
  start(channel: string): void {
    if (this.isRunning) {
      return;
    }

    this.config.currentChannel = channel;
    this.isRunning = true;

    console.log(`[Capture] Starting for ${channel}`);

    // Start OCR loop
    this.timers.push(
      setInterval(() => this.runOcr(), this.config.ocrIntervalMs)
    );

    // Start stream state polling (switch channels when frontend changes)
    this.timers.push(
      setInterval(() => this.pollStreamState(), 5_000)
    );

    // Start audio capture
    this.startAudioCapture();

    // Run initial OCR
    this.runOcr();
  }

  /**
   * Stop capturing
   */
  stop(): void {
    this.isRunning = false;

    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];

    console.log('[Capture] Stopped');
  }

  /**
   * Switch to a different channel
   */
  switchChannel(channel: string): void {
    console.log(`[Capture] Switching to ${channel}`);
    this.config.currentChannel = channel;
  }

  /**
   * Get current status
   */
  getStatus(): { channel: string; isRunning: boolean; lastOcr: number; lastAudio: number; totalCaptures: number } {
    return {
      channel: this.config.currentChannel,
      isRunning: this.isRunning,
      lastOcr: this.lastOcrTime,
      lastAudio: this.lastAudioTime,
      totalCaptures: this.totalCaptures,
    };
  }

  getStorage(): StorageClient {
    return this.storage;
  }

  /**
   * Poll stream state from Cosmos DB — switch if frontend changed channel
   */
  private async pollStreamState(): Promise<void> {
    try {
      const state = await this.storage.getStreamState();
      if (!state) {
        return;
      }

      const target = state.channel;

      if (target && target !== this.config.currentChannel) {
        logChannelSwitch({
          from: this.config.currentChannel,
          to: target,
          reason: 'Frontend switched',
          isLive: true,
        });
        this.config.currentChannel = target;
      }
    } catch (err) {
      logError(err as Error, { component: 'pollStreamState' });
    }
  }

  /**
   * Run OCR on current stream frame
   */
  private async runOcr(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const startTime = Date.now();
      const thumbnail = await this.fetchThumbnail();
      if (!thumbnail) return;

      const capture = await this.ocrWorker.captureFrame(
        thumbnail,
        this.config.currentChannel
      );

      await this.storage.storeOcr(capture);
      this.lastOcrTime = Date.now();
      this.totalCaptures++;

      const durationMs = Date.now() - startTime;
      
      logCapture({
        channel: this.config.currentChannel,
        type: 'ocr',
        captureCount: this.totalCaptures,
        durationMs,
      });

      trackMetric('OcrCaptureDuration', durationMs, { channel: this.config.currentChannel });

      // Check for highlights
      const highlight = await this.highlightManager.checkForHighlight(
        capture,
        null
      );
      if (highlight) {
        logCapture({
          channel: this.config.currentChannel,
          type: 'highlight',
          captureCount: this.totalCaptures,
        });
      }
    } catch (error) {
      logError(error as Error, { component: 'runOcr', channel: this.config.currentChannel });
    }
  }

  /**
   * Continuous audio capture loop
   */
  private async startAudioCapture(): Promise<void> {
    while (this.isRunning) {
      try {
        const audioChunk = await this.recordAudioChunk();
        if (!audioChunk) continue;

        const transcript = await this.audioWorker.transcribeChunk(
          audioChunk,
          this.config.currentChannel,
          this.config.audioChunkSeconds
        );

        await this.storage.storeTranscript(transcript);
        this.lastAudioTime = Date.now();

        // Check for highlights
        const highlight = await this.highlightManager.checkForHighlight(
          null,
          transcript
        );
        if (highlight) {
          console.log(`[Capture] Audio highlight: ${highlight.reason}`);
        }
      } catch (error) {
        console.error('[Capture] Audio failed:', error);
      }
    }
  }

  /**
   * Fetch Twitch stream thumbnail
   */
  private async fetchThumbnail(): Promise<string | null> {
    try {
      const url = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${this.config.currentChannel}-1920x1080.jpg?_t=${Date.now()}`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      return this.blobToBase64(blob);
    } catch (error) {
      console.error('[Capture] Thumbnail fetch failed:', error);
      return null;
    }
  }

  /**
   * Convert Blob to base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    const buffer = Buffer.from(await blob.arrayBuffer());
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }

  /**
   * Record audio chunk (placeholder - implement actual audio recording)
   */
  private async recordAudioChunk(): Promise<Buffer | null> {
    // TODO: Implement actual audio recording from stream
    // This would use FFmpeg to capture audio from the HLS stream
    return null;
  }
}
