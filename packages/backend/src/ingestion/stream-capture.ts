// ============================================================
// MOMTV Backend - Stream Capture (FFmpeg)
// ============================================================
// Captures live streams from Twitch/Kick/YouTube using streamlink + ffmpeg.
// Extracts video frames for analysis and audio for transcription.
// ============================================================

import { spawn, type ChildProcess } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { StreamConfig, VideoFrame } from "@momtv/shared";

const FRAMES_DIR = join(process.cwd(), ".cache", "frames");
const AUDIO_DIR = join(process.cwd(), ".cache", "audio");

export class StreamCapture {
  private processes: Map<string, ChildProcess> = new Map();
  private frameCallbacks: Map<string, (frame: VideoFrame) => void> = new Map();
  private audioCallbacks: Map<string, (chunk: Buffer) => void> = new Map();
  private frameTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private config: StreamConfig;

  constructor(config: StreamConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    await mkdir(FRAMES_DIR, { recursive: true });
    await mkdir(AUDIO_DIR, { recursive: true });

    const streamUrl = this.getStreamUrl();
    console.log(`[StreamCapture] Starting capture for ${this.config.name} (${streamUrl})`);

    // Start video capture process
    this.startVideoCapture(streamUrl);

    // Start audio extraction process
    if (this.config.captureAudio) {
      this.startAudioCapture(streamUrl);
    }

    // Start frame sampling at configured rate
    this.startFrameSampling();
  }

  stop(): void {
    console.log(`[StreamCapture] Stopping capture for ${this.config.name}`);

    for (const [id, proc] of this.processes) {
      proc.kill("SIGTERM");
      this.processes.delete(id);
    }

    for (const [id, timer] of this.frameTimers) {
      clearInterval(timer);
      this.frameTimers.delete(id);
    }
  }

  onFrame(callback: (frame: VideoFrame) => void): void {
    this.frameCallbacks.set(this.config.id, callback);
  }

  onAudioChunk(callback: (chunk: Buffer) => void): void {
    this.audioCallbacks.set(this.config.id, callback);
  }

  // --- Internal ---

  private getStreamUrl(): string {
    switch (this.config.platform) {
      case "twitch":
        return `https://www.twitch.tv/${this.config.channel}`;
      case "kick":
        return `https://kick.com/${this.config.channel}`;
      case "youtube":
        return this.config.url;
      case "vkplay":
        return `https://live.vkplay.ru/${this.config.channel}`;
      default:
        return this.config.url;
    }
  }

  private startVideoCapture(streamUrl: string): void {
    // Use streamlink to get the stream URL, then ffmpeg to capture frames
    const quality = this.config.quality === "best" ? "best" : this.config.quality;

    // First, get the direct stream URL via streamlink
    const streamlink = spawn("streamlink", [
      streamUrl,
      quality,
      "--stream-url",
    ]);

    let directUrl = "";
    streamlink.stdout.on("data", (data: Buffer) => {
      directUrl += data.toString().trim();
    });

    streamlink.on("close", () => {
      if (directUrl) {
        this.spawnFfmpegVideo(directUrl);
      } else {
        console.error(`[StreamCapture] Could not get stream URL for ${this.config.name}`);
        // Retry after delay
        setTimeout(() => this.startVideoCapture(streamUrl), 10000);
      }
    });

    streamlink.on("error", (err) => {
      console.error(`[StreamCapture] Streamlink error: ${err.message}`);
      setTimeout(() => this.startVideoCapture(streamUrl), 15000);
    });
  }

  private spawnFfmpegVideo(streamUrl: string): void {
    const outputPattern = join(FRAMES_DIR, `${this.config.id}_%04d.jpg`);

    const ffmpeg = spawn("ffmpeg", [
      "-i", streamUrl,
      "-vf", "fps=1",  // 1 frame per second (we sample from this)
      "-q:v", "5",     // JPEG quality
      "-f", "image2",
      "-y",             // Overwrite
      outputPattern,
    ], { stdio: ["ignore", "ignore", "pipe"] });

    ffmpeg.stderr.on("data", (data: Buffer) => {
      const msg = data.toString();
      if (msg.includes("error") || msg.includes("Error")) {
        console.error(`[StreamCapture] FFmpeg stderr: ${msg.slice(0, 200)}`);
      }
    });

    ffmpeg.on("close", (code) => {
      console.log(`[StreamCapture] FFmpeg video exited with code ${code}`);
      // Auto-restart
      if (code !== 0) {
        setTimeout(() => this.startVideoCapture(this.getStreamUrl()), 5000);
      }
    });

    this.processes.set(`${this.config.id}-video`, ffmpeg);
  }

  private startAudioCapture(streamUrl: string): void {
    // Use streamlink + ffmpeg to extract audio
    const streamlink = spawn("streamlink", [
      this.getStreamUrl(),
      this.config.quality === "best" ? "best" : this.config.quality,
      "--stream-url",
    ]);

    let directUrl = "";
    streamlink.stdout.on("data", (data: Buffer) => {
      directUrl += data.toString().trim();
    });

    streamlink.on("close", () => {
      if (directUrl) {
        this.spawnFfmpegAudio(directUrl);
      }
    });
  }

  private spawnFfmpegAudio(streamUrl: string): void {
    const outputPath = join(AUDIO_DIR, `${this.config.id}_audio.wav`);

    const ffmpeg = spawn("ffmpeg", [
      "-i", streamUrl,
      "-vn",                    // No video
      "-acodec", "pcm_s16le",  // WAV format
      "-ar", "16000",           // 16kHz for Whisper
      "-ac", "1",               // Mono
      "-f", "wav",
      "-y",
      outputPath,
    ], { stdio: ["ignore", "ignore", "pipe"] });

    ffmpeg.on("close", (code) => {
      console.log(`[StreamCapture] FFmpeg audio exited with code ${code}`);
    });

    this.processes.set(`${this.config.id}-audio`, ffmpeg);
  }

  private startFrameSampling(): void {
    const sampleRate = this.config.frameSampleRate * 1000;

    const timer = setInterval(async () => {
      try {
        // Read the latest frame from the frames directory
        // In production, this would read from FFmpeg's output
        const frame: VideoFrame = {
          streamId: this.config.id,
          timestamp: Date.now(),
          imageBase64: "", // Will be populated by frame extraction
          width: 1280,
          height: 720,
        };

        const callback = this.frameCallbacks.get(this.config.id);
        if (callback) {
          callback(frame);
        }
      } catch (err) {
        // Frame sampling errors are non-fatal
      }
    }, sampleRate);

    this.frameTimers.set(this.config.id, timer);
  }
}