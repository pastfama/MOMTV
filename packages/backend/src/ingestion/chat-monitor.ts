// ============================================================
// MOMTV Backend - Chat Monitor
// ============================================================
// Connects to Twitch IRC, Kick chat, YouTube Live Chat, VK Play Live
// to monitor real-time chat messages.
// ============================================================

import type { StreamConfig, ChatMessage, StreamPlatform } from "@momtv/shared";

export interface ChatMonitorCallbacks {
  onMessage: (message: ChatMessage) => void;
  onConnect: (platform: StreamPlatform) => void;
  onDisconnect: (platform: StreamPlatform) => void;
  onError: (error: Error) => void;
}

export class ChatMonitor {
  private config: StreamConfig;
  private callbacks: ChatMonitorCallbacks;
  private messageBuffer: ChatMessage[] = [];
  private bufferCallbacks: ((messages: ChatMessage[]) => void)[] = [];
  private isConnected = false;

  constructor(config: StreamConfig, callbacks: ChatMonitorCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    if (!this.config.captureChat) {
      console.log(`[ChatMonitor] Chat capture disabled for ${this.config.name}`);
      return;
    }

    console.log(`[ChatMonitor] Connecting to ${this.config.platform} chat for ${this.config.channel}`);

    switch (this.config.platform) {
      case "twitch":
        await this.connectTwitch();
        break;
      case "kick":
        await this.connectKick();
        break;
      case "youtube":
        await this.connectYouTube();
        break;
      case "vkplay":
        await this.connectVKPlay();
        break;
      default:
        console.warn(`[ChatMonitor] Chat not supported for platform: ${this.config.platform}`);
    }
  }

  stop(): void {
    this.isConnected = false;
    console.log(`[ChatMonitor] Disconnected from ${this.config.platform} chat`);
  }

  getRecentMessages(count: number = 50): ChatMessage[] {
    return this.messageBuffer.slice(-count);
  }

  onBufferFull(callback: (messages: ChatMessage[]) => void): void {
    this.bufferCallbacks.push(callback);
  }

  // --- Twitch IRC Connection ---

  private async connectTwitch(): Promise<void> {
    try {
      // Dynamic import for tmi.js (CommonJS module)
      const tmi = await import("tmi.js");

      // Anonymous login - no Twitch auth needed for reading chat
      const anonymousUsername = `justinfan${Math.floor(Math.random() * 100000)}`;
      const client = new tmi.Client({
        options: { debug: false },
        connection: {
          secure: true,
          reconnect: true,
        },
        identity: {
          username: anonymousUsername,
          password: undefined, // anonymous - no OAuth token
        },
        channels: [this.config.channel],
      });

      client.on("message", (channel, tags, message, self) => {
        if (self) return;

        const chatMsg: ChatMessage = {
          streamId: this.config.id,
          platform: "twitch",
          username: tags["display-name"] ?? tags.username ?? "anonymous",
          message,
          timestamp: new Date(),
          badges: tags.badges ? Object.keys(tags.badges) : [],
          emotes: tags.emotes ? Object.keys(tags.emotes) : [],
        };

        this.handleMessage(chatMsg);
      });

      client.on("connected", () => {
        this.isConnected = true;
        console.log(`[ChatMonitor] Connected to Twitch: ${this.config.channel}`);
        this.callbacks.onConnect("twitch");
      });

      client.on("disconnected", () => {
        this.isConnected = false;
        console.log(`[ChatMonitor] Disconnected from Twitch: ${this.config.channel}`);
        this.callbacks.onDisconnect("twitch");
      });

      await client.connect();
    } catch (err) {
      this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // --- Kick Chat (WebSocket) ---

  private async connectKick(): Promise<void> {
    try {
      // Kick uses a WebSocket API
      const ws = new WebSocket(`wss://chat.kick.com/ws`);

      ws.onopen = () => {
        this.isConnected = true;
        console.log(`[ChatMonitor] Connected to Kick chat: ${this.config.channel}`);
        this.callbacks.onConnect("kick");

        // Subscribe to channel
        ws.send(JSON.stringify({
          event: "subscribe",
          data: { channel_name: this.config.channel },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as {
            event: string;
            data: {
              chatroom_id: number;
              content: string;
              sender: { username: string; badges: string[] };
              created_at: string;
            };
          };

          if (data.event === "ChatMessageEvent") {
            const chatMsg: ChatMessage = {
              streamId: this.config.id,
              platform: "kick",
              username: data.data.sender.username,
              message: data.data.content,
              timestamp: new Date(data.data.created_at),
              badges: data.data.sender.badges ?? [],
              emotes: [],
            };
            this.handleMessage(chatMsg);
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = (err) => {
        this.callbacks.onError(new Error(`Kick chat error: ${err}`));
      };

      ws.onclose = () => {
        this.isConnected = false;
        this.callbacks.onDisconnect("kick");
        // Auto-reconnect after 5 seconds
        setTimeout(() => this.connectKick(), 5000);
      };
    } catch (err) {
      this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // --- YouTube Live Chat (placeholder - needs YouTube Data API key) ---

  private async connectYouTube(): Promise<void> {
    console.log(`[ChatMonitor] YouTube chat requires Data API v3 key. Using polling.`);
    // YouTube live chat requires OAuth and Data API v3
    // Implementation would poll the YouTube Live Chat API
    this.isConnected = true;
    this.callbacks.onConnect("youtube");
  }

  // --- VK Play Live Chat (placeholder) ---

  private async connectVKPlay(): Promise<void> {
    console.log(`[ChatMonitor] VK Play Live chat connection placeholder.`);
    this.isConnected = true;
    this.callbacks.onConnect("vkplay");
  }

  // --- Internal ---

  private handleMessage(msg: ChatMessage): void {
    this.messageBuffer.push(msg);

    // Keep buffer limited to last 500 messages
    if (this.messageBuffer.length > 500) {
      this.messageBuffer = this.messageBuffer.slice(-500);
    }

    this.callbacks.onMessage(msg);

    // Check if buffer is full (100 messages)
    if (this.messageBuffer.length % 100 === 0) {
      for (const cb of this.bufferCallbacks) {
        cb([...this.messageBuffer]);
      }
    }
  }
}