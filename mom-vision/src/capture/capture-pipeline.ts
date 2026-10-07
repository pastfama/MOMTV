import type { CaptureConfig, StreamState } from './types.js';
import { initLogger, logCapture, logChannelSwitch, logError, trackMetric } from '../logging/logger.js';
import { OcrWorker } from './ocr-worker.js';
import { AudioWorker } from './audio-worker.js';
import { StorageClient } from './storage-client.js';
import { HighlightManager } from './highlight-manager.js';
import { StatusTracker } from './stream-status.js';

const DEFAULT_CONFIG: CaptureConfig = {
  ocrIntervalMs: 5_000,
  audioChunkSeconds: 30,
  storageRetentionDays: 30,
  currentChannel: '',
};

const API_BASE = process.env.API_BASE || 'https://momtv.azurewebsites.net';

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
    initLogger();
  }

  start(channel: string): void {
    if (this.isRunning) return;
    this.config.currentChannel = channel;
    this.isRunning = true;
    console.log(`[Capture] Starting for ${channel}`);
    this.timers.push(setInterval(() => this.runOcr(), this.config.ocrIntervalMs));
    this.timers.push(setInterval(() => this.pollStreamState(), 5_000));
    this.startAudioCapture();
    this.runOcr();
  }

  stop(): void {
    this.isRunning = false;
    for (const timer of this.timers) clearInterval(timer);
    this.timers = [];
  }

  switchChannel(channel: string): void {
    this.config.currentChannel = channel;
  }

  getStatus() {
    return {
      channel: this.config.currentChannel,
      isRunning: this.isRunning,
      lastOcr: this.lastOcrTime,
      lastAudio: this.lastAudioTime,
      totalCaptures: this.totalCaptures,
    };
  }

  getStorage(): StorageClient { return this.storage; }

  private async pollStreamState(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/capture/state`);
      if (!res.ok) return;
      const state: any = await res.json();
      if (state.channel && state.channel !== this.config.currentChannel) {
        console.log(`[Capture] Frontend switched to: ${state.channel}`);
        this.config.currentChannel = state.channel;
      }
    } catch (err) {
      console.error('[Capture] pollStreamState error:', err);
    }
  }

  private async runOcr(): Promise<void> {
    if (!this.isRunning) return;
    try {
      const startTime = Date.now();
      const thumbnail = await this.fetchThumbnail();
      if (!thumbnail) return;
      const capture = await this.ocrWorker.captureFrame(thumbnail, this.config.currentChannel);
      await this.storage.storeOcr(capture);
      this.lastOcrTime = Date.now();
      this.totalCaptures++;
      const durationMs = Date.now() - startTime;
      logCapture({ channel: this.config.currentChannel, type: 'ocr', captureCount: this.totalCaptures, durationMs });
      trackMetric('OcrCaptureDuration', durationMs, { channel: this.config.currentChannel });
      const highlight = await this.highlightManager.checkForHighlight(capture, null);
      if (highlight) {
        logCapture({ channel: this.config.currentChannel, type: 'highlight', captureCount: this.totalCaptures });
      }
    } catch (error) {
      logError(error as Error, { component: 'runOcr', channel: this.config.currentChannel });
    }
  }

  private async startAudioCapture(): Promise<void> {
    while (this.isRunning) {
      try {
        const audioChunk = await this.recordAudioChunk();
        if (!audioChunk) continue;
        const transcript = await this.audioWorker.transcribeChunk(audioChunk, this.config.currentChannel, this.config.audioChunkSeconds);
        await this.storage.storeTranscript(transcript);
        this.lastAudioTime = Date.now();
      } catch (error) {
        // Silently ignore
      }
    }
  }

  private async fetchThumbnail(): Promise<string | null> {
    try {
      const url = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${this.config.currentChannel}-1920x1080.jpg?_t=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return this.blobToBase64(blob);
    } catch { return null; }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    const buffer = Buffer.from(await blob.arrayBuffer());
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }

  private async recordAudioChunk(): Promise<Buffer | null> {
    return null;
  }
}
