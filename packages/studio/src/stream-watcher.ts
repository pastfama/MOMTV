// ============================================================
// MOM TV — Stream Watcher Agent
// ============================================================
// Real-time stream monitoring via Twitch GQL + IRC WebSocket.
// Detects events (viewer spikes, raids, game changes, chat surges)
// and emits WatcherReport objects for the studio to consume.
// ============================================================

import type {
  WatcherReport,
  StreamEvent,
  StreamEventType,
  ChatRateMetrics,
  AlertLevel,
} from "@momtv/shared";

// ── Configuration ────────────────────────────────────────────

const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const TWITCH_GQL_URL = "https://gql.twitch.tv/gql";
const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";

// ── Types ────────────────────────────────────────────────────

export type WatcherHandler = (report: WatcherReport) => void;
export type EventHandler = (event: StreamEvent) => void;

interface StreamMeta {
  isLive: boolean;
  viewerCount: number;
  game: string;
  title: string;
  startedAt: string | null;
}

interface ChatWindow {
  messages: Array<{ user: string; text: string; ts: number }>;
  startTime: number;
}

// ── Stream Watcher ───────────────────────────────────────────

export class StreamWatcher {
  private channel: string;
  private metaTimer: ReturnType<typeof setInterval> | null = null;
  private ircSocket: WebSocket | null = null;
  private watcherHandlers: WatcherHandler[] = [];
  private eventHandlers: EventHandler[] = [];

  // State tracking
  private lastMeta: StreamMeta | null = null;
  private viewerHistory: Array<{ count: number; ts: number }> = [];
  private chatWindows: ChatWindow[] = [];
  private recentEvents: StreamEvent[] = [];
  private currentChatWindow: ChatWindow = { messages: [], startTime: Date.now() };

  // Detection thresholds
  private readonly VIEWER_SPIKE_RATIO = 1.3; // 30% increase
  private readonly VIEWER_DROP_RATIO = 0.7; // 30% decrease
  private readonly CHAT_SURGE_RPM = 120; // messages per minute
  private readonly CHAT_WINDOW_MS = 60_000; // 1 minute windows

  constructor(channel: string) {
    this.channel = channel;
  }

  // ── Public API ───────────────────────────────────────────

  onReport(handler: WatcherHandler): void {
    this.watcherHandlers.push(handler);
  }

  onEvent(handler: EventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Start watching: metadata polling every 30s + IRC chat connection.
   */
  start(): void {
    console.log(`[StreamWatcher] Starting watch for ${this.channel}`);

    // Initial metadata fetch
    this.pollMetadata();

    // Metadata polling every 30 seconds
    this.metaTimer = setInterval(() => this.pollMetadata(), 30_000);

    // Connect to Twitch IRC
    this.connectIRC();

    // Chat window aggregation every 60 seconds
    setInterval(() => this.flushChatWindow(), this.CHAT_WINDOW_MS);
  }

  /**
   * Stop watching.
   */
  stop(): void {
    if (this.metaTimer) {
      clearInterval(this.metaTimer);
      this.metaTimer = null;
    }
    if (this.ircSocket) {
      this.ircSocket.close();
      this.ircSocket = null;
    }
    console.log("[StreamWatcher] Stopped");
  }

  /**
   * Get current stream state snapshot.
   */
  getSnapshot(): StreamMeta | null {
    return this.lastMeta;
  }

  /**
   * Get recent events.
   */
  getRecentEvents(limit: number = 10): StreamEvent[] {
    return this.recentEvents.slice(-limit);
  }

  // ── Twitch GQL Metadata ──────────────────────────────────

  private async pollMetadata(): Promise<void> {
    try {
      // Route through Azure Function proxy to avoid CORS
      const proxyUrl = "/api/twitch/gql";
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `query($login: String!) {
            user(login: $login) {
              stream {
                type
                viewersCount
                game { displayName }
                title
                createdAt
              }
            }
          }`,
          variables: { login: this.channel },
        }),
      });

      if (!response.ok) return;

      const data = (await response.json()) as {
        data?: {
          user?: {
            stream?: {
              type: string;
              viewersCount?: number;
              game?: { displayName: string } | null;
              title?: string;
              createdAt?: string;
            } | null;
          };
        };
      };

      const stream = data.data?.user?.stream;
      const meta: StreamMeta = {
        isLive: stream?.type === "live",
        viewerCount: stream?.viewersCount ?? 0,
        game: stream?.game?.displayName ?? "Unknown",
        title: stream?.title ?? "",
        startedAt: stream?.createdAt ?? null,
      };

      this.processMetaUpdate(meta);
    } catch (err) {
      console.warn("[StreamWatcher] Metadata poll failed:", err);
    }
  }

  private processMetaUpdate(meta: StreamMeta): void {
    const prev = this.lastMeta;
    this.lastMeta = meta;

    // Track viewer history
    this.viewerHistory.push({ count: meta.viewerCount, ts: Date.now() });
    if (this.viewerHistory.length > 120) this.viewerHistory.shift(); // Keep 1 hour

    if (!prev) return; // First poll, no comparison

    // Detect stream state changes
    if (!prev.isLive && meta.isLive) {
      this.emitEvent({
        type: "stream_live",
        timestamp: Date.now(),
        description: `${this.channel} went LIVE: ${meta.title}`,
        severity: 0.8,
        metadata: { game: meta.game, title: meta.title },
      });
      this.emitReport("elevated", `${this.channel} is now LIVE — ${meta.game}: ${meta.title}`);
    }

    if (prev.isLive && !meta.isLive) {
      this.emitEvent({
        type: "stream_offline",
        timestamp: Date.now(),
        description: `${this.channel} went offline`,
        severity: 0.6,
      });
      this.emitReport("elevated", `${this.channel} went offline`);
    }

    // Detect game change
    if (prev.game !== meta.game && meta.isLive) {
      this.emitEvent({
        type: "game_change",
        timestamp: Date.now(),
        description: `Game changed: ${prev.game} → ${meta.game}`,
        severity: 0.5,
        metadata: { from: prev.game, to: meta.game },
      });
      this.emitReport("normal", `Game changed to ${meta.game}`);
    }

    // Detect title change
    if (prev.title !== meta.title && meta.isLive && meta.title) {
      this.emitEvent({
        type: "title_change",
        timestamp: Date.now(),
        description: `Title changed: "${meta.title}"`,
        severity: 0.3,
      });
    }

    // Detect viewer spikes/drops
    if (prev.isLive && meta.isLive && prev.viewerCount > 0) {
      const ratio = meta.viewerCount / prev.viewerCount;

      if (ratio >= this.VIEWER_SPIKE_RATIO) {
        const pctChange = Math.round((ratio - 1) * 100);
        this.emitEvent({
          type: "viewer_spike",
          timestamp: Date.now(),
          description: `Viewer spike: +${pctChange}% (${prev.viewerCount} → ${meta.viewerCount})`,
          severity: Math.min(1, 0.5 + pctChange / 100),
          metadata: { from: prev.viewerCount, to: meta.viewerCount },
        });
        this.emitReport("elevated", `Viewer spike detected! +${pctChange}% viewers (${meta.viewerCount.toLocaleString()} total)`);
      }

      if (ratio <= this.VIEWER_DROP_RATIO) {
        const pctDrop = Math.round((1 - ratio) * 100);
        this.emitEvent({
          type: "viewer_drop",
          timestamp: Date.now(),
          description: `Viewer drop: -${pctDrop}% (${prev.viewerCount} → ${meta.viewerCount})`,
          severity: Math.min(1, 0.3 + pctDrop / 100),
          metadata: { from: prev.viewerCount, to: meta.viewerCount },
        });
      }
    }

    // Periodic normal report (every 5th poll ≈ 2.5 min)
    if (this.recentEvents.length > 0 && this.recentEvents.length % 5 === 0) {
      this.emitReport("normal", `${meta.game} — ${meta.viewerCount.toLocaleString()} viewers`);
    }
  }

  // ── Twitch IRC Chat ──────────────────────────────────────

  private connectIRC(): void {
    try {
      this.ircSocket = new WebSocket(IRC_URL);

      this.ircSocket.onopen = () => {
        console.log("[StreamWatcher] IRC connected");
        // Anonymous connection — just read
        this.ircSocket!.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
        this.ircSocket!.send("NICK justinfan12345");
        this.ircSocket!.send(`JOIN #${this.channel.toLowerCase()}`);
      };

      this.ircSocket.onmessage = (event) => {
        this.handleIRCMessage(event.data as string);
      };

      this.ircSocket.onclose = () => {
        console.log("[StreamWatcher] IRC disconnected, reconnecting in 5s...");
        setTimeout(() => this.connectIRC(), 5000);
      };

      this.ircSocket.onerror = (err) => {
        console.warn("[StreamWatcher] IRC error:", err);
      };
    } catch (err) {
      console.warn("[StreamWatcher] IRC connection failed:", err);
    }
  }

  private handleIRCMessage(raw: string): void {
    const lines = raw.split("\r\n");

    for (const line of lines) {
      if (!line.trim()) continue;

      // Respond to PING to keep connection alive
      if (line.startsWith("PING")) {
        this.ircSocket?.send("PONG :tmi.twitch.tv");
        continue;
      }

      // Parse PRIVMSG (regular chat messages)
      const privmsgMatch = line.match(
        /^@([^ ]+) :([a-zA-Z0-9_]+)![a-zA-Z0-9_]+@[a-zA-Z0-9_]+\.tmi\.twitch\.tv PRIVMSG #[a-zA-Z0-9_]+ :(.+)$/,
      );
      if (privmsgMatch) {
        const tags = privmsgMatch[1];
        const user = privmsgMatch[2];
        const text = privmsgMatch[3];

        // Track in current chat window
        this.currentChatWindow.messages.push({
          user,
          text,
          ts: Date.now(),
        });

        // Check for raid detection via USERNOTICE
        continue;
      }

      // Parse USERNOTICE (raids, hype trains, etc.)
      const usernoticeMatch = line.match(
        /^@([^ ]+) :tmi\.twitch\.tv USERNOTICE #([a-zA-Z0-9_]+) ?(.*)$/,
      );
      if (usernoticeMatch) {
        const tags = usernoticeMatch[1];
        this.handleUsernotice(tags, usernoticeMatch[3]);
        continue;
      }
    }
  }

  private handleUsernotice(tags: string, _message: string): void {
    const msgId = this.extractTag(tags, "msg-id");

    if (msgId === "raid") {
      const raider = this.extractTag(tags, "msg-param-displayName") || "Unknown";
      const viewerCount = parseInt(
        this.extractTag(tags, "msg-param-viewerCount") || "0",
        10,
      );

      this.emitEvent({
        type: "raid",
        timestamp: Date.now(),
        description: `RAID from ${raider} with ${viewerCount} viewers!`,
        severity: 0.9,
        metadata: { raider, viewerCount },
      });

      this.emitReport(
        "breaking",
        `🚨 RAID! ${raider} is raiding with ${viewerCount} viewers!`,
      );
    }

    if (msgId === "hype_train_start") {
      this.emitEvent({
        type: "hype_train",
        timestamp: Date.now(),
        description: "Hype Train started!",
        severity: 0.7,
      });
      this.emitReport("elevated", "🚂 Hype Train has started!");
    }

    if (msgId === "hype_train_level_up") {
      const level = this.extractTag(tags, "msg-param-level") || "?";
      this.emitEvent({
        type: "hype_train",
        timestamp: Date.now(),
        description: `Hype Train level ${level}!`,
        severity: 0.8,
        metadata: { level },
      });
      this.emitReport("elevated", `🚂 Hype Train Level ${level}!`);
    }
  }

  private extractTag(tags: string, key: string): string | null {
    const pattern = new RegExp(`(?:^|;)${key}=([^;]*)`);
    const match = tags.match(pattern);
    return match ? match[1] : null;
  }

  // ── Chat Window Aggregation ──────────────────────────────

  private flushChatWindow(): void {
    const window = this.currentChatWindow;
    this.currentChatWindow = { messages: [], startTime: Date.now() };

    if (window.messages.length === 0) return;

    this.chatWindows.push(window);
    if (this.chatWindows.length > 60) this.chatWindows.shift(); // Keep 1 hour

    // Calculate chat rate
    const durationMin = (Date.now() - window.startTime) / 60_000;
    const rpm = durationMin > 0 ? window.messages.length / durationMin : 0;
    const uniqueUsers = new Set(window.messages.map((m) => m.user)).size;

    // Detect chat surge
    if (rpm >= this.CHAT_SURGE_RPM) {
      this.emitEvent({
        type: "chat_surge",
        timestamp: Date.now(),
        description: `Chat surge: ${Math.round(rpm)} msg/min, ${uniqueUsers} unique chatters`,
        severity: Math.min(1, rpm / 300),
        metadata: { rpm: Math.round(rpm), uniqueUsers },
      });
      this.emitReport("elevated", `Chat is on fire! ${Math.round(rpm)} messages/min from ${uniqueUsers} chatters`);
    }

    // Build chat metrics for reports
    const metrics = this.buildChatMetrics(window);
    if (this.lastMeta?.isLive) {
      this.emitWatcherReport("normal", metrics);
    }
  }

  private buildChatMetrics(window: ChatWindow): ChatRateMetrics {
    const durationMin = (Date.now() - window.startTime) / 60_000;
    const rpm = durationMin > 0 ? window.messages.length / durationMin : 0;
    const uniqueChatters = new Set(window.messages.map((m) => m.user)).size;

    // Simple keyword extraction (top words by frequency)
    const wordCounts = new Map<string, number>();
    const stopWords = new Set(["the", "a", "an", "is", "was", "are", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "i", "you", "he", "she", "it", "we", "they", "this", "that", "не", "и", "в", "на", "я", "что", "это", "как", "так", "но", "да", "нет", "за", "по"]);

    for (const msg of window.messages) {
      const words = msg.text.toLowerCase().split(/\s+/);
      for (const word of words) {
        const clean = word.replace(/[^a-zа-яё0-9]/gi, "");
        if (clean.length > 2 && !stopWords.has(clean)) {
          wordCounts.set(clean, (wordCounts.get(clean) || 0) + 1);
        }
      }
    }

    const trendingKeywords = [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    // Simple sentiment (positive/negative keyword ratio)
    const positiveWords = ["pog", "hype", "nice", "good", "best", "love", "wow", "amazing", "great", "лол", "ого", "круто", "лучший"];
    const negativeWords = ["bad", "worst", "hate", "boring", "trash", "lame", "zzz", "плохо", "скучно"];
    let pos = 0;
    let neg = 0;
    for (const msg of window.messages) {
      const lower = msg.text.toLowerCase();
      for (const w of positiveWords) if (lower.includes(w)) pos++;
      for (const w of negativeWords) if (lower.includes(w)) neg++;
    }
    const total = pos + neg;
    const sentiment = total === 0 ? "neutral" : pos > neg * 1.5 ? "positive" : neg > pos * 1.5 ? "negative" : "mixed";

    return {
      messagesPerMinute: Math.round(rpm),
      uniqueChatters,
      topEmotes: trendingKeywords,
      sentiment,
      trendingKeywords,
    };
  }

  // ── Event & Report Emission ──────────────────────────────

  private emitEvent(event: StreamEvent): void {
    this.recentEvents.push(event);
    if (this.recentEvents.length > 100) this.recentEvents.shift();

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error("[StreamWatcher] Event handler error:", err);
      }
    }
  }

  private emitReport(alertLevel: AlertLevel, summary: string): void {
    const meta = this.lastMeta;
    const report: WatcherReport = {
      alert_level: alertLevel,
      summary,
      notable_events: this.recentEvents.slice(-5).map((e) => e.description),
      viewer_engagement: this.getEngagementDescription(),
      streamer_behavior: meta?.isLive ? "Live and streaming" : "Offline",
      game_detected: meta?.game,
      viewer_count: meta?.viewerCount,
      is_live: meta?.isLive,
    };

    this.deliverReport(report);
  }

  private emitWatcherReport(alertLevel: AlertLevel, chatMetrics: ChatRateMetrics): void {
    const meta = this.lastMeta;
    if (!meta) return;

    const report: WatcherReport = {
      alert_level: alertLevel,
      summary: `${meta.game} — ${meta.viewerCount.toLocaleString()} viewers — ${chatMetrics.messagesPerMinute} msg/min`,
      notable_events: this.recentEvents.slice(-5).map((e) => e.description),
      viewer_engagement: this.getEngagementDescription(),
      streamer_behavior: meta.isLive ? "Live and streaming" : "Offline",
      game_detected: meta.game,
      viewer_count: meta.viewerCount,
      is_live: meta.isLive,
      chat_metrics: chatMetrics,
    };

    this.deliverReport(report);
  }

  private deliverReport(report: WatcherReport): void {
    console.log(
      `[StreamWatcher] Report [${report.alert_level}]: ${report.summary}`,
    );

    for (const handler of this.watcherHandlers) {
      try {
        handler(report);
      } catch (err) {
        console.error("[StreamWatcher] Report handler error:", err);
      }
    }
  }

  private getEngagementDescription(): string {
    const recent = this.chatWindows.slice(-5);
    if (recent.length === 0) return "No chat data yet";

    const totalMessages = recent.reduce(
      (sum, w) => sum + w.messages.length,
      0,
    );
    const totalUnique = new Set(recent.flatMap((w) => w.messages.map((m) => m.user))).size;
    const avgRPM =
      recent.length > 0
        ? totalMessages / (recent.length * (this.CHAT_WINDOW_MS / 60_000))
        : 0;

    if (avgRPM > 100) return `Very high engagement (${Math.round(avgRPM)} msg/min, ${totalUnique} chatters)`;
    if (avgRPM > 30) return `High engagement (${Math.round(avgRPM)} msg/min, ${totalUnique} chatters)`;
    if (avgRPM > 10) return `Moderate engagement (${Math.round(avgRPM)} msg/min)`;
    return `Low engagement (${Math.round(avgRPM)} msg/min)`;
  }
}