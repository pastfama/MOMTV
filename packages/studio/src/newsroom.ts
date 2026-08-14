// ============================================================
// MOM TV — Newsroom Controller v6
// ============================================================
// 60s Retro TV Studio with embedded stream, anchor speech bubbles,
// Foundry prompt agent integration, and vision-based stream analysis.
// ============================================================

import { AgentClient, type AgentResponse } from "./agent-client.js";
import { StreamAnalyzer, type StreamAnalysis } from "./stream-analyzer.js";
import { StreamWatcher } from "./stream-watcher.js";
import { VIClient } from "./vi-client.js";
import { AnalyticsClient } from "./analytics-client.js";
import { apiUrl } from "./api-config.js";
import type { AnchorScript, WatcherReport, VideoIndexerInsights } from "@momtv/shared";

// ── Configuration ────────────────────────────────────────────────

const TWITCH_CHANNEL = "KNIG04Ei";
const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

// ── Newsroom Class ───────────────────────────────────────────────

export class Newsroom {
  private agentClient: AgentClient;
  private streamAnalyzer: StreamAnalyzer;
  private streamWatcher: StreamWatcher;
  private viClient: VIClient;
  private analyticsClient: AnalyticsClient;
  private streamStatusTimer: ReturnType<typeof setInterval> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private showScheduleTimer: ReturnType<typeof setInterval> | null = null;
  private isLive = false;
  private currentVodId: string | null = null;
  private showCounter = 0;

  constructor() {
    this.agentClient = new AgentClient();
    this.streamAnalyzer = new StreamAnalyzer();
    this.streamWatcher = new StreamWatcher(TWITCH_CHANNEL);
    this.viClient = new VIClient();
    this.analyticsClient = new AnalyticsClient();
  }

  async init(): Promise<void> {
    console.log("[Newsroom] Initializing MOM TV 60s Retro Studio...");

    // Embed GTA5 VOD directly (stream is offline, KNIG04Ei GTA5RP replay)
    this.embedVod("2845796121");

    // Start stream status polling
    this.startStreamStatusPolling();

    // Set up agent response handlers
    this.agentClient.onResponse((response) => this.handleAgentResponse(response));

    // Set up visual analysis handler
    this.streamAnalyzer.onAnalysis((analysis) => this.handleVisualAnalysis(analysis));

    // Start clock
    this.startClock();

    // Auto-start agent monitoring
    this.startAgentMonitoring();

    // Start visual analysis (every 15 seconds)
    this.streamAnalyzer.start(15_000);

    // Start scheduled TV shows
    this.startShowSchedule();

    // Start chat logging
    this.startChatLogging();

    // Start FIB intelligence gathering
    this.startFIBRoutine();

    // Start Stream Watcher (real-time Twitch metadata + IRC chat)
    this.startStreamWatcher();

    // Connect to Video Indexer SSE stream
    this.startVIClient();

    // Start analytics client (batches and sends data to backend)
    this.startAnalytics();

    console.log("[Newsroom] MOM TV 60s Retro Studio ready!");
  }

  private startAgentMonitoring(): void {
    console.log("[Newsroom] Sending initial agent commands...");
    this.agentClient.startMonitoring(TWITCH_CHANNEL, "twitch");
  }

  // ── Chat Logging ────────────────────────────────────────────

  private startChatLogging(): void {
    console.log("[Newsroom] Starting chat logging...");
    this.fetchChat(); // Initial fetch
    setInterval(() => this.fetchChat(), 15_000); // Every 15 seconds
  }

  private async fetchChat(): Promise<void> {
    try {
      const response = await fetch(apiUrl("/api/twitch/gql"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query($login: String!) {
            channel(name: $login) {
              recentChatMessages(limit: 25) {
                edges {
                  node {
                    message { text }
                    sender { login displayName chatColor }
                  }
                }
              }
            }
          }`,
          variables: { login: TWITCH_CHANNEL },
        }),
      });

      if (!response.ok) return;
      const data = await response.json() as Record<string, unknown>;
      const channel = (data as { data?: { channel?: { recentChatMessages?: { edges?: Array<{ node?: { message?: { text?: string }; sender?: { login?: string; displayName?: string; chatColor?: string } } }> } } } }).data?.channel;
      const edges = channel?.recentChatMessages?.edges || [];

      const chatContainer = document.getElementById("chat-messages");
      const chatCount = document.getElementById("chat-count");
      if (!chatContainer) return;

      // Add new messages
      let newCount = 0;
      for (const edge of edges) {
        const msg = edge.node;
        if (!msg?.message?.text || !msg?.sender?.login) continue;

        const user = msg.sender.displayName || msg.sender.login;
        const color = msg.sender.chatColor || "#d4a843";
        const text = msg.message.text;

        // Deduplicate by checking last messages
        const isDuplicate = Array.from(chatContainer.children).some(
          el => el.textContent?.includes(text) && el.textContent?.includes(user)
        );
        if (isDuplicate) continue;

        const msgEl = document.createElement("div");
        msgEl.className = "chat-msg";
        msgEl.innerHTML = `<span class="chat-user" style="color:${this.escapeHtml(color)}">${this.escapeHtml(user)}</span><span class="chat-text">${this.escapeHtml(text)}</span>`;
        chatContainer.appendChild(msgEl);
        newCount++;
      }

      // Keep only last 100 messages
      while (chatContainer.children.length > 100) {
        chatContainer.removeChild(chatContainer.firstChild!);
      }

      chatContainer.scrollTop = chatContainer.scrollHeight;

      // Update count
      if (chatCount) {
        const total = chatContainer.children.length;
        chatCount.textContent = `${total} msgs`;
      }
    } catch (err) {
      console.warn("[Newsroom] Chat fetch failed:", err);
    }
  }

  // ── FIB Intelligence Routine ─────────────────────────────────

  private startFIBRoutine(): void {
    console.log("[Newsroom] Starting FIB intelligence gathering...");
    // Run FIB every 3 minutes
    setInterval(() => {
      this.agentClient.sendCommand("agent-fib",
        `INTELLIGENCE GATHERING MISSION for KNIG04Ei on Twitch. ` +
        `Search the web for KNIG04Ei's latest activity, social media, and community discussions. ` +
        `Find information about the game currently being played. ` +
        `Look for similar streamers and compare engagement metrics. ` +
        `Check for notable events, clips, or highlights. ` +
        `Return your intelligence report with profile updates.`
      );
    }, 180_000);

    // First FIB run after 45 seconds
    setTimeout(() => {
      this.agentClient.sendCommand("agent-fib",
        `INTELLIGENCE GATHERING MISSION for KNIG04Ei on Twitch. ` +
        `Search the web for KNIG04Ei's latest activity, social media, and community discussions. ` +
        `Find information about the game currently being played. ` +
        `Look for similar streamers and compare engagement metrics. ` +
        `Check for notable events, clips, or highlights. ` +
        `Return your intelligence report with profile updates.`
      );
    }, 45_000);
  }

  // ── Scheduled TV Shows ─────────────────────────────────────

  private startShowSchedule(): void {
    // Show schedule:
    // Every 2 min: Quick news update (director)
    // Every 5 min: Full news segment (director + show-producer)
    // Every 10 min: Deep analysis (all agents)
    // Every 30 min: System health check (meta-agent)

    console.log("[Newsroom] Starting TV show schedule...");

    // Quick news every 2 minutes
    setInterval(() => {
      this.showCounter++;
      this.runShow("quick-news");
    }, 120_000);

    // Full news segment every 5 minutes
    setInterval(() => {
      this.runShow("full-news");
    }, 300_000);

    // Deep analysis every 10 minutes
    setInterval(() => {
      this.runShow("deep-analysis");
    }, 600_000);

    // System health every 30 minutes
    setInterval(() => {
      this.runShow("system-health");
    }, 1_800_000);

    // Run first show after 30 seconds
    setTimeout(() => this.runShow("quick-news"), 30_000);
  }

  private runShow(showType: string): void {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    console.log(`[Newsroom] 🎬 Running show: ${showType} at ${time}`);

    switch (showType) {
      case "quick-news":
        // Director generates a quick 2-exchange anchor dialogue
        this.agentClient.sendCommand("director",
          `Generate a QUICK NEWS UPDATE for KNIG04Ei on Twitch. ` +
          `Write a 2-exchange dialogue between Alex and Sasha. ` +
          `Alex starts with a brief headline, Sasha responds with analysis. ` +
          `Keep each line 1-2 sentences. Make it feel like breaking into a live broadcast.`
        );
        break;

      case "full-news":
        // Director + Show Producer for a full segment
        this.agentClient.sendCommand("show-producer",
          `Produce a FULL NEWS SEGMENT for KNIG04Ei on Twitch. ` +
          `Write a 4-exchange dialogue between Alex (anchor) and Sasha (analyst): ` +
          `1. Alex opens with the main story ` +
          `2. Sasha provides analysis/context ` +
          `3. Alex asks a follow-up question ` +
          `4. Sasha wraps up with insight ` +
          `Make it engaging like a real TV news broadcast. Include a ticker.`
        );
        break;

      case "deep-analysis":
        // All agents collaborate
        this.agentClient.sendCommand("content-analyzer",
          `Provide a detailed visual analysis of the current stream state for KNIG04Ei.`
        );
        this.agentClient.sendCommand("chat-pulse",
          `Analyze the current chat sentiment and trending topics.`
        );
        // Director synthesizes after a delay
        setTimeout(() => {
          this.agentClient.sendCommand("director",
            `DEEP ANALYSIS SEGMENT for KNIG04Ei. ` +
            `Write a 6-exchange dialogue between Alex and Sasha covering: ` +
            `1. Current stream status and game analysis ` +
            `2. Viewer engagement and chat trends ` +
            `3. Content quality assessment ` +
            `4. Comparison with similar streamers ` +
            `5. Predictions for the rest of the stream ` +
            `6. Sign-off with key takeaway ` +
            `Each line should be 2-3 sentences. Make it feel like an in-depth TV analysis show.`
          );
        }, 5000);
        break;

      case "system-health":
        this.agentClient.sendCommand("meta-agent",
          `Run a full system health check on all MOMTV agents. Evaluate pipeline performance and suggest improvements.`
        );
        break;
    }
  }

  // ── Twitch Embed (inside CRT TV screen) ────────────────────

  private getParents(): string[] {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return ["localhost", "127.0.0.1"];
    }
    return [hostname];
  }

  private embedStream(): void {
    const screen = document.getElementById("tv-screen");
    if (!screen) return;

    const parents = this.getParents();
    const parentParams = parents.map(p => `&parent=${p}`).join("");
    const src = `https://player.twitch.tv/?channel=${TWITCH_CHANNEL}${parentParams}&autoplay=true&muted=true`;

    console.log(`[Newsroom] Embedding stream: ${src}`);

    // Remove existing iframe if any
    const existing = screen.querySelector("iframe");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.allowFullscreen = true;
    iframe.setAttribute("allow", "autoplay; fullscreen; encrypted-media; picture-in-picture");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.position = "absolute";
    iframe.style.top = "0";
    iframe.style.left = "0";
    screen.style.position = "relative";
    screen.style.width = "100%";
    screen.style.height = "100%";
    screen.insertBefore(iframe, screen.firstChild);

    this.isLive = true;
    this.currentVodId = null;
    console.log(`[Newsroom] Stream embedded: ${TWITCH_CHANNEL}`);
  }

  private embedVod(vodId: string): void {
    if (this.currentVodId === vodId) return;

    const screen = document.getElementById("tv-screen");
    if (!screen) return;

    const parents = this.getParents();
    const parentParams = parents.map(p => `&parent=${p}`).join("");
    const src = `https://player.twitch.tv/?video=${vodId}${parentParams}&autoplay=true&muted=true`;

    const existing = screen.querySelector("iframe");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.allowFullscreen = true;
    iframe.setAttribute("allow", "autoplay; fullscreen; encrypted-media; picture-in-picture");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.position = "absolute";
    iframe.style.top = "0";
    iframe.style.left = "0";
    screen.insertBefore(iframe, screen.firstChild);

    this.currentVodId = vodId;
    this.isLive = false;
  }

  // ── Stream Status Polling ────────────────────────────────────

  private startStreamStatusPolling(): void {
    this.checkStreamStatus();
    this.streamStatusTimer = setInterval(() => this.checkStreamStatus(), 60_000);
  }

  private async checkStreamStatus(): Promise<void> {
    try {
      const response = await fetch(apiUrl("/api/twitch/gql"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `query($login: String!) {
            user(login: $login) {
              stream { type viewersCount game { displayName } title }
              videos(first: 10, type: ARCHIVE, sort: TIME) { edges { node { id title game { displayName } } } }
            }
          }`,
          variables: { login: TWITCH_CHANNEL },
        }),
      });

      if (!response.ok) return;

      const data = await response.json() as {
        data?: { user?: { stream?: { type: string; viewersCount?: number; game?: { displayName: string } | null; title?: string } | null; videos?: { edges: Array<{ node: { id: string; title: string; game?: { displayName: string } | null } }> } } };
      };

      const user = data.data?.user;
      if (!user) return;

      const isCurrentlyLive = user.stream?.type === "live";

      if (isCurrentlyLive) {
        if (!this.isLive) this.embedStream();

        // Update viewer count
        const viewerEl = document.getElementById("viewer-count");
        if (viewerEl && user.stream?.viewersCount) {
          viewerEl.textContent = `${user.stream.viewersCount.toLocaleString()} viewers`;
        }

        // Update stream title
        const titleEl = document.getElementById("stream-title");
        if (titleEl && user.stream?.title) {
          titleEl.textContent = user.stream.title;
        }
      } else {
        // Stream is offline — find a GTA5 VOD
        const vodEdges = user.videos?.edges || [];

        // Prefer GTA5 VODs
        const gtaVod = vodEdges.find(e => {
          const game = e.node.game?.displayName?.toLowerCase() || "";
          return game.includes("grand theft auto") || game.includes("gta");
        });

        const vodToPlay = gtaVod || vodEdges[0];

        if (vodToPlay) {
          this.embedVod(vodToPlay.node.id);
          const titleEl = document.getElementById("stream-title");
          if (titleEl) titleEl.textContent = `VOD: ${vodToPlay.node.title || "GTA5 Replay"}`;
        } else {
          // No VOD found — hardcoded fallback GTA5 VOD for KNIG04Ei
          this.embedVod("2845796121");
          const titleEl = document.getElementById("stream-title");
          if (titleEl) titleEl.textContent = "VOD: GTA5 RP Replay";
        }
      }
    } catch (err) {
      console.warn("[Newsroom] Status check failed:", err);
    }
  }

  // ── Visual Analysis Handler ──────────────────────────────────

  private handleVisualAnalysis(analysis: StreamAnalysis): void {
    console.log(`[Newsroom] Visual analysis: ${analysis.game_detected} (${analysis.mood})`);

    // Add to news table
    this.addNewsEntry(
      "content-analyzer",
      "normal",
      `${analysis.game_detected} — ${analysis.scene_description} (${analysis.mood}, ${analysis.production_quality})`
    );

    // Update ticker with visual analysis
    this.updateTicker(`🎬 ${analysis.game_detected} | ${analysis.mood} | ${analysis.scene_description}`);
  }

  // ── Agent Response Handler ───────────────────────────────────

  private handleAgentResponse(response: AgentResponse): void {
    const feed = document.getElementById("commentary-feed");
    if (!feed) return;

    // Try to parse as AnchorScript JSON
    let script: AnchorScript | null = null;
    let displayText = response.content;

    try {
      script = JSON.parse(response.content) as AnchorScript;
      displayText = this.formatAnchorScript(response.agent, script);
    } catch {
      // Not JSON, use raw text
    }

    // Show anchor speech bubbles if we have a script with alex/sasha
    if (script) {
      this.handleAnchorScript(script);
    }

    // Add to commentary feed
    const tagClass = response.agent.replace(/[^a-z-]/g, "");
    const time = new Date(response.timestamp).toLocaleTimeString();

    const item = document.createElement("div");
    item.className = "feed-item";
    item.innerHTML = `
      <span class="feed-tag ${tagClass}">${response.agent.toUpperCase()}</span>
      <div class="feed-body"><div class="feed-text">${this.escapeHtml(displayText)}</div></div>
      <span class="feed-time">${time}</span>
    `;

    feed.appendChild(item);

    // Also add to news table for important agents
    if (["director", "show-producer", "chat-pulse"].includes(response.agent) && script) {
      const severity = script.scene?.type === "breaking" ? "breaking" : "normal";
      this.addNewsEntry(response.agent, severity, displayText);
    }

    // Keep only last 50 items
    while (feed.children.length > 50) {
      feed.removeChild(feed.firstChild!);
    }

    feed.scrollTop = feed.scrollHeight;

    // Update ticker
    if (script?.ticker) {
      this.updateTicker(script.ticker);
    } else {
      this.updateTicker(displayText.slice(0, 120));
    }

    // Update sentiment if from chat-pulse
    if (response.agent === "chat-pulse" && script) {
      this.updateSentiment(script);
    }

    // Update viewer count if from stream-monitor
    if (response.agent === "stream-monitor" && script?.viewer_count) {
      const viewerEl = document.getElementById("viewer-count");
      if (viewerEl) {
        viewerEl.textContent = `${script.viewer_count.toLocaleString()} viewers`;
      }
    }

    // Show news overlay for breaking scenes or watcher alerts
    if (script?.scene?.type === "breaking") {
      this.showNewsOverlay(script.alex?.text || script.title || "Breaking News");
    }

    // Handle stream-watcher reports
    if (response.agent === "stream-watcher") {
      this.handleWatcherReport(response.content);
    }
  }

  // ── Anchor Script Handling ───────────────────────────────────

  private handleAnchorScript(script: AnchorScript): void {
    // Handle multi-exchange dialogue array (new format from director v3)
    const dialogue = (script as Record<string, unknown>).dialogue as Array<{speaker: string; text: string; emotion?: string}> | undefined;

    if (dialogue && Array.isArray(dialogue) && dialogue.length > 0) {
      // Play each dialogue line with staggered timing
      dialogue.forEach((line, index) => {
        const delay = index * 4000; // 4 seconds between each line
        setTimeout(() => {
          if (line.speaker === "alex") {
            this.showSpeechBubble("alex", line.text, line.emotion);
          } else if (line.speaker === "sasha") {
            this.showSpeechBubble("sasha", line.text, line.emotion);
          }
        }, delay);
      });
    } else {
      // Fallback: single exchange (backward compatibility)
      if (script.alex?.text) {
        this.showSpeechBubble("alex", script.alex.text, script.alex.emotion);
      }
      if (script.sasha?.text) {
        setTimeout(() => {
          this.showSpeechBubble("sasha", script.sasha!.text, script.sasha!.emotion);
        }, 2000);
      }
    }
  }

  private showSpeechBubble(anchorId: string, text: string, _emotion?: string): void {
    const bubbleText = document.getElementById(`bubble-${anchorId}-text`);
    const anchorEl = document.getElementById(`anchor-${anchorId}`);

    if (!bubbleText) return;

    bubbleText.textContent = text;

    // Add speaking class to anchor card (triggers CSS animation + shows speech)
    if (anchorEl) {
      anchorEl.classList.add("speaking");
    }

    // Auto-hide after duration (based on text length, min 5s, max 20s)
    const duration = Math.max(5000, Math.min(20000, text.length * 60));

    setTimeout(() => {
      if (anchorEl) {
        anchorEl.classList.remove("speaking");
      }
    }, duration);

    console.log(`[Newsroom] ${anchorId} speaking: "${text.slice(0, 50)}..."`);
  }

  private showNewsOverlay(text: string): void {
    const overlay = document.getElementById("news-overlay");
    const content = document.getElementById("news-content");

    if (overlay && content) {
      content.textContent = text;
      overlay.classList.add("visible");

      setTimeout(() => overlay.classList.remove("visible"), 15000);
    }
  }

  // ── Stream Watcher ─────────────────────────────────────────

  private startStreamWatcher(): void {
    console.log("[Newsroom] Starting Stream Watcher...");

    // Handle watcher reports — update UI and feed real data to Director
    this.streamWatcher.onReport((report: WatcherReport) => {
      this.handleWatcherReport(report);

      // Feed real watcher data to Director for grounded commentary
      if (report.alert_level !== "normal") {
        const context = [
          `REAL-TIME STREAM DATA:`,
          `Game: ${report.game_detected || "Unknown"}`,
          `Viewers: ${report.viewer_count?.toLocaleString() || "N/A"}`,
          `Engagement: ${report.viewer_engagement}`,
          `Events: ${report.notable_events.join("; ") || "None"}`,
          `Alert: ${report.alert_level} — ${report.summary}`,
        ].join("\n");

        this.agentClient.sendCommand("director",
          `Based on this REAL stream data, generate anchor commentary for Alex and Sasha:\n\n${context}\n\nMake it feel like breaking into a live broadcast with real data.`
        );
      }
    });

    // Handle individual stream events — add to news table + commentary feed
    this.streamWatcher.onEvent((event) => {
      // Add to news table
      const severity = event.severity > 0.7 ? "breaking" : event.severity > 0.4 ? "elevated" : "normal";
      this.addNewsEntry("stream-watcher", severity, event.description);

      // Add to commentary feed
      const feed = document.getElementById("commentary-feed");
      if (!feed) return;

      const time = new Date(event.timestamp).toLocaleTimeString();
      const severityIcon = event.severity > 0.7 ? "🔴" : event.severity > 0.4 ? "🟡" : "🟢";

      const item = document.createElement("div");
      item.className = "feed-item";
      item.innerHTML = `
        <span class="feed-tag stream-watcher">WATCHER</span>
        <div class="feed-body"><div class="feed-text">${severityIcon} ${this.escapeHtml(event.description)}</div></div>
        <span class="feed-time">${time}</span>
      `;

      feed.appendChild(item);
      while (feed.children.length > 50) feed.removeChild(feed.firstChild!);
      feed.scrollTop = feed.scrollHeight;
    });

    // Start watching
    this.streamWatcher.start();
  }

  // ── Video Indexer Client ───────────────────────────────────

  private startVIClient(): void {
    console.log("[Newsroom] Connecting to Video Indexer stream...");

    this.viClient.onInsights((insights: VideoIndexerInsights) => {
      this.handleVIInsights(insights);
    });

    this.viClient.connect();
  }

  private handleVIInsights(insights: VideoIndexerInsights): void {
    // Update the VI summary in commentary header
    const viSummary = document.getElementById("vi-summary");
    if (viSummary) {
      const parts = [];
      if (insights.transcript.length > 0) parts.push(`${insights.transcript.length} lines`);
      if (insights.topics.length > 0) parts.push(insights.topics.slice(0, 2).join(", "));
      viSummary.textContent = parts.join(" | ") || "—";
    }

    // Add to news table
    const summary = [
      insights.transcript.slice(0, 2).join(" "),
      insights.topics.length > 0 ? `Topics: ${insights.topics.join(", ")}` : "",
    ].filter(Boolean).join(" | ");
    if (summary) {
      this.addNewsEntry("video-indexer", "normal", summary.slice(0, 200));
    }

    // Add to commentary feed
    const feed = document.getElementById("commentary-feed");
    if (feed) {
      const time = new Date(insights.timestamp).toLocaleTimeString();
      const feedSummary = [
        insights.transcript.slice(0, 2).join(" "),
        insights.ocrText.length > 0 ? `OCR: ${insights.ocrText.slice(0, 3).join(", ")}` : "",
        insights.topics.length > 0 ? `Topics: ${insights.topics.join(", ")}` : "",
      ].filter(Boolean).join(" | ");

      const item = document.createElement("div");
      item.className = "feed-item";
      item.innerHTML = `
        <span class="feed-tag video-indexer">VI</span>
        <div class="feed-body"><div class="feed-text">${this.escapeHtml(feedSummary.slice(0, 200))}</div></div>
        <span class="feed-time">${time}</span>
      `;

      feed.appendChild(item);
      while (feed.children.length > 50) feed.removeChild(feed.firstChild!);
      feed.scrollTop = feed.scrollHeight;
    }

    // Send VI insights to Director as context for anchor scripts
    if (insights.transcript.length > 0 || insights.topics.length > 0) {
      const viContext = [
        `VIDEO INDEXER ANALYSIS:`,
        insights.transcript.length > 0 ? `Transcript: ${insights.transcript.slice(0, 3).join(" ")}` : "",
        insights.ocrText.length > 0 ? `On-screen text: ${insights.ocrText.slice(0, 5).join(", ")}` : "",
        insights.topics.length > 0 ? `Topics: ${insights.topics.join(", ")}` : "",
        insights.summary ? `Summary: ${insights.summary}` : "",
      ].filter(Boolean).join("\n");

      this.agentClient.sendCommand("director",
        `Video Indexer just completed a segment analysis. Use this data to enhance your next commentary:\n\n${viContext}`
      );
    }

    // Update ticker with VI summary
    if (insights.topics.length > 0) {
      this.updateTicker(`📊 VI: ${insights.topics.slice(0, 3).join(", ")} | ${insights.transcript.length} transcript lines`);
    }

    console.log(`[Newsroom] VI insights: ${insights.transcript.length} transcript, ${insights.topics.length} topics`);
  }

  // ── Analytics ─────────────────────────────────────────────

  private startAnalytics(): void {
    console.log("[Newsroom] Starting analytics client...");
    this.analyticsClient.start();

    // Hook: Stream events → analytics
    this.streamWatcher.onEvent((event) => {
      this.analyticsClient.recordStreamEvent(event);
    });

    // Hook: Watcher reports → analytics
    this.streamWatcher.onReport((report) => {
      this.analyticsClient.recordWatcherReport(report);
    });

    // Hook: VI insights → analytics
    this.viClient.onInsights((insights) => {
      this.analyticsClient.recordVIInsights(insights);
    });

    // Hook: Agent outputs → analytics
    this.agentClient.onResponse((response) => {
      this.analyticsClient.recordAgentOutput(response.agent, response.content, response.timestamp);
    });

    // Periodic viewer count sampling (every 5 min)
    setInterval(() => {
      const snapshot = this.streamWatcher.getSnapshot();
      if (snapshot) {
        this.analyticsClient.recordViewerSample(snapshot.viewerCount, snapshot.game, snapshot.isLive);
      }
    }, 300_000);

    // Expose for debugging
    (window as Record<string, unknown>).momtvAnalytics = this.analyticsClient;
  }

  // ── Stream Watcher Report Handler ───────────────────────────

  /**
   * Handle watcher report — accepts either a WatcherReport object or a JSON string.
   */
  private handleWatcherReport(content: string | WatcherReport): void {
    try {
      const report: {
        alert_level?: string;
        summary?: string;
        notable_events?: string[];
        viewer_engagement?: string;
        streamer_behavior?: string;
        game_detected?: string;
        mood?: string;
        scene_description?: string;
        production_quality?: string;
        viewer_count?: number;
      } = typeof content === "string" ? JSON.parse(content) : content;

      // Update viewer count from watcher
      if (report.viewer_count) {
        const viewerEl = document.getElementById("viewer-count");
        if (viewerEl) viewerEl.textContent = `${report.viewer_count.toLocaleString()} viewers`;
      }

      // Add to news table
      const severity = report.alert_level === "breaking" ? "breaking" : report.alert_level === "elevated" ? "elevated" : "normal";
      if (report.summary) {
        this.addNewsEntry("stream-watcher", severity, report.summary);
      }

      // Show breaking news overlay for elevated/breaking alerts
      if (report.alert_level === "breaking" || report.alert_level === "elevated") {
        this.showNewsOverlay(report.summary || "Watch alert detected");
      }

      // Update ticker with watcher summary
      if (report.summary) {
        this.updateTicker(`WATCHER: ${report.summary}`);
      }

      console.log(`[Newsroom] Watcher report: ${report.alert_level} — ${report.summary}`);
    } catch {
      // Not valid JSON, ignore
    }
  }

  // ── News Table Helper ──────────────────────────────────────

  private newsCount = 0;

  private addNewsEntry(source: string, severity: "breaking" | "elevated" | "normal", text: string): void {
    const table = document.getElementById("news-table");
    if (!table) return;

    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    this.newsCount++;

    // Update count badge
    const countEl = document.getElementById("news-count");
    if (countEl) countEl.textContent = `${this.newsCount} events`;

    const entry = document.createElement("div");
    entry.className = "news-entry";
    entry.innerHTML = `
      <div class="news-severity ${severity}"></div>
      <div class="news-content">
        <div class="news-text">${this.escapeHtml(text.slice(0, 200))}</div>
        <div class="news-meta">
          <span class="news-source ${source}">${source.toUpperCase()}</span>
          <span class="news-time">${time}</span>
        </div>
      </div>
    `;

    // Insert after the header (first child)
    const header = table.querySelector(".news-table-header");
    if (header && header.nextSibling) {
      table.insertBefore(entry, header.nextSibling);
    } else {
      table.appendChild(entry);
    }

    // Keep only last 100 entries
    const entries = table.querySelectorAll(".news-entry");
    while (entries.length > 100) {
      entries[0].remove();
    }
  }

  // ── Formatting ───────────────────────────────────────────────

  private formatAnchorScript(_agent: string, script: AnchorScript): string {
    switch (script.type) {
      case "commentary":
      case "segment":
      case "news": {
        const parts: string[] = [];
        if (script.alex) parts.push(`Alex: "${script.alex.text.slice(0, 80)}..."`);
        if (script.sasha) parts.push(`Sasha: "${script.sasha.text.slice(0, 80)}..."`);
        return parts.join(" → ") || `[${script.type}] ${script.title || ""}`;
      }
      case "snapshot":
        return `${script.streamer || "?"} | ${script.game || "?"} | ${script.viewer_count || "--"} viewers | ${script.chat_sentiment || "neutral"}`;
      case "analysis":
        return `${script.game_detected || "?"} | ${script.production_quality || "?"} | ${script.scene_description || ""}`;
      case "sentiment":
        return `${script.overall_sentiment || "neutral"} (${script.sentiment_score || 0}) | toxicity: ${script.toxicity_level || "none"}`;
      case "health":
        return `System health: ${Object.values(script.agent_health || {}).filter(v => v === "healthy").length}/${Object.keys(script.agent_health || {}).length} agents healthy`;
      case "visual":
        return `Visual: ${script.mood || "?"} | ${script.overlay?.style || "?"}`;
      default:
        return typeof script === "object" ? JSON.stringify(script, null, 0).slice(0, 200) : String(script);
    }
  }

  // ── UI Helpers ───────────────────────────────────────────────

  private updateTicker(text: string): void {
    const ticker = document.getElementById("ticker-content");
    if (ticker) ticker.textContent = `MOM TV | ${text}`;
  }

  private updateSentiment(script: AnchorScript): void {
    const fill = document.getElementById("sentiment-fill");
    const text = document.getElementById("sentiment-text");

    if (fill && text && script.sentiment_score !== undefined) {
      const score = script.sentiment_score;
      const sentiment = script.overall_sentiment || "neutral";
      const pct = Math.round(score * 100);

      fill.style.width = `${pct}%`;

      const colors: Record<string, string> = {
        positive: "#6b8e4e",
        excited: "#d4a843",
        neutral: "#8b7355",
        negative: "#c0392b",
        toxic: "#8b0000",
        mixed: "#8b5cf6",
      };

      fill.style.background = colors[sentiment] || "#8b7355";
      text.textContent = `${sentiment} (${pct}%)`;
    }
  }

  private startClock(): void {
    const clockEl = document.getElementById("clock");
    const update = () => {
      if (clockEl) {
        clockEl.textContent = new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      }
    };
    update();
    this.clockTimer = setInterval(update, 1000);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}