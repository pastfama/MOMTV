// ============================================================
// MOM TV — Newsroom Controller v5
// ============================================================
// TV studio with embedded stream screen, anchor speech bubbles,
// and Foundry prompt agent integration.
// ============================================================

import { AgentClient, type AgentResponse } from "./agent-client.js";
import type { AnchorScript } from "@momtv/shared";

// ── Configuration ────────────────────────────────────────────────

const TWITCH_CHANNEL = "KNIG04Ei";
const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

// ── Newsroom Class ───────────────────────────────────────────────

export class Newsroom {
  private agentClient: AgentClient;
  private streamStatusTimer: ReturnType<typeof setInterval> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private isLive = false;
  private currentVodId: string | null = null;

  constructor() {
    this.agentClient = new AgentClient();
  }

  async init(): Promise<void> {
    console.log("[Newsroom] Initializing MOM TV Studio...");

    // Embed stream into the TV screen
    this.embedStream();

    // Start stream status polling
    this.startStreamStatusPolling();

    // Set up agent response handlers
    this.agentClient.onResponse((response) => this.handleAgentResponse(response));

    // Start clock
    this.startClock();

    // Auto-start agent monitoring (initial commands only, routines handle scheduling)
    this.startAgentMonitoring();

    console.log("[Newsroom] MOM TV Studio ready!");
  }

  private startAgentMonitoring(): void {
    console.log("[Newsroom] Sending initial agent commands...");
    this.agentClient.startMonitoring(TWITCH_CHANNEL, "twitch");
  }

  // ── Twitch Embed (inside TV screen) ─────────────────────────

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

    console.log(`[Newsroom] Embedding stream in TV screen: ${src}`);

    // Remove existing iframe if any
    const existing = screen.querySelector("iframe");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.allowFullscreen = true;
    screen.insertBefore(iframe, screen.firstChild);

    this.isLive = true;
    this.currentVodId = null;
    console.log(`[Newsroom] Stream embedded in TV screen: ${TWITCH_CHANNEL}`);
  }

  private embedVod(vodId: string): void {
    if (this.currentVodId === vodId) return;

    const screen = document.getElementById("tv-screen");
    if (!screen) return;

    const parents = this.getParents();
    const parentParams = parents.map(p => `&parent=${p}`).join("");
    const src = `https://player.twitch.tv/?video=${vodId}${parentParams}&autoplay=true&muted=true`;

    console.log(`[Newsroom] Embedding VOD in TV screen: ${src}`);

    const existing = screen.querySelector("iframe");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.allowFullscreen = true;
    screen.insertBefore(iframe, screen.firstChild);

    this.currentVodId = vodId;
    this.isLive = false;
    console.log(`[Newsroom] VOD embedded: ${vodId}`);
  }

  // ── Stream Status Polling ────────────────────────────────────

  private startStreamStatusPolling(): void {
    this.checkStreamStatus();
    this.streamStatusTimer = setInterval(() => this.checkStreamStatus(), 60_000);
  }

  private async checkStreamStatus(): Promise<void> {
    try {
      const response = await fetch("https://gql.twitch.tv/gql", {
        method: "POST",
        headers: {
          "Client-Id": TWITCH_CLIENT_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `query($login: String!) {
            user(login: $login) {
              stream { type viewersCount game { displayName } title }
              videos(first: 1) { edges { node { id title } } }
            }
          }`,
          variables: { login: TWITCH_CHANNEL },
        }),
      });

      if (!response.ok) return;

      const data = await response.json() as {
        data?: { user?: { stream?: { type: string; viewersCount?: number; game?: { displayName: string } | null; title?: string } | null; videos?: { edges: Array<{ node: { id: string } }> } } };
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
      } else {
        const vodEdges = user.videos?.edges;
        if (vodEdges && vodEdges.length > 0) {
          this.embedVod(vodEdges[0].node.id);
        }
      }
    } catch (err) {
      console.warn("[Newsroom] Status check failed:", err);
    }
  }

  // ── Agent Response Handler (parses AnchorScript JSON) ────────

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
      <div class="agent-tag ${tagClass}">${response.agent.toUpperCase()}</div>
      <div class="text">${this.escapeHtml(displayText)}</div>
      <div class="time">${time}</div>
    `;

    feed.appendChild(item);

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

    // Show news overlay for breaking scenes
    if (script?.scene?.type === "breaking") {
      this.showNewsOverlay(script.alex?.text || script.title || "Breaking News");
    }
  }

  // ── Anchor Script Handling ───────────────────────────────────

  private handleAnchorScript(script: AnchorScript): void {
    // Show Alex speech bubble
    if (script.alex?.text) {
      this.showSpeechBubble("alex", script.alex.text, script.alex.emotion);
    }

    // Show Sasha speech bubble (slight delay for natural dialogue)
    if (script.sasha?.text) {
      setTimeout(() => {
        this.showSpeechBubble("sasha", script.sasha!.text, script.sasha!.emotion);
      }, 2000);
    }
  }

  private showSpeechBubble(anchorId: string, text: string, emotion?: string): void {
    const bubble = document.getElementById(`bubble-${anchorId}`);
    const bubbleText = document.getElementById(`bubble-${anchorId}-text`);
    const anchorEl = document.getElementById(`anchor-${anchorId}`);

    if (!bubble || !bubbleText) return;

    bubbleText.textContent = text;
    bubble.classList.add("visible");

    // Set speaking animation
    if (anchorEl) {
      anchorEl.classList.add("speaking");
    }

    // Auto-hide after duration (based on text length, min 5s, max 20s)
    const duration = Math.max(5000, Math.min(20000, text.length * 60));

    setTimeout(() => {
      bubble.classList.remove("visible");
      if (anchorEl) {
        anchorEl.classList.remove("speaking");
      }
    }, duration);

    console.log(`[Newsroom] ${anchorId} speaking (${emotion}): "${text.slice(0, 50)}..."`);
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

  // ── Formatting ───────────────────────────────────────────────

  private formatAnchorScript(agent: string, script: AnchorScript): string {
    switch (script.type) {
      case "commentary":
      case "segment":
      case "news": {
        const parts: string[] = [];
        if (script.alex) parts.push(`🧑‍💼 Alex: "${script.alex.text.slice(0, 80)}..."`);
        if (script.sasha) parts.push(`👩‍💻 Sasha: "${script.sasha.text.slice(0, 80)}..."`);
        return parts.join(" → ") || `[${script.type}] ${script.title || ""}`;
      }
      case "snapshot":
        return `🎮 ${script.streamer || "?"} | ${script.game || "?"} | 👥 ${script.viewer_count || "--"} | ${script.chat_sentiment || "neutral"}`;
      case "analysis":
        return `🎬 ${script.game_detected || "?"} | ${script.production_quality || "?"} | ${script.scene_description || ""}`;
      case "sentiment":
        return `💬 ${script.overall_sentiment || "neutral"} (${script.sentiment_score || 0}) | ☠️ ${script.toxicity_level || "none"}`;
      case "health":
        return `🔍 System health: ${Object.values(script.agent_health || {}).filter(v => v === "healthy").length}/${Object.keys(script.agent_health || {}).length} agents healthy`;
      case "visual":
        return `🎨 Visual: ${script.mood || "?"} | ${script.overlay?.style || "?"}`;
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
        positive: "#22c55e", excited: "#f59e0b", neutral: "#888",
        negative: "#ef4444", toxic: "#dc2626", mixed: "#8b5cf6",
      };

      fill.style.background = colors[sentiment] || "#888";
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