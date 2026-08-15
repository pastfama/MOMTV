// ============================================================
// MOMTV — World Narrator (MC-CIV Pattern)
// ============================================================
// Watches the Twitch stream and generates events.
// Routes events to appropriate agents.
// Inspired by MC-CIV's World Narrator architecture.
// ============================================================

import type {
  WorldState,
  WorldEvent,
  AgentBrain,
  StreamState,
  ChatState,
} from "@momtv/shared";

// --- Event ID Generator ---
let eventCounter = 0;
function generateEventId(): string {
  eventCounter++;
  return `evt_${Date.now()}_${eventCounter}`;
}

// --- MOMTV World Narrator ---

export class MOMTVWorldNarrator {
  private previousStreamState: StreamState | null = null;
  private previousChatState: ChatState | null = null;
  private eventThresholds = {
    viewerSpikeRatio: 1.3,
    viewerDropRatio: 0.7,
    chatSurgeRPM: 120,
    sentimentSwingThreshold: 0.3,
  };

  /**
   * Observe the world state and generate events.
   * Called every simulation tick.
   */
  observe(worldState: WorldState): WorldEvent[] {
    const events: WorldEvent[] = [];
    const now = Date.now();

    // 1. Stream state changes
    if (this.previousStreamState) {
      const prev = this.previousStreamState;
      const curr = worldState.stream;

      // Stream went live
      if (!prev.isLive && curr.isLive) {
        events.push(this.createEvent(now, "stream_live", "stream", 
          `${curr.game} stream is now LIVE: ${curr.title}`, 0.8));
      }

      // Stream went offline
      if (prev.isLive && !curr.isLive) {
        events.push(this.createEvent(now, "stream_offline", "stream",
          "Stream went offline", 0.6));
      }

      // Viewer spike
      if (prev.isLive && curr.isLive && prev.viewers > 0) {
        const ratio = curr.viewers / prev.viewers;
        if (ratio >= this.eventThresholds.viewerSpikeRatio) {
          const pct = Math.round((ratio - 1) * 100);
          events.push(this.createEvent(now, "viewer_spike", "stream",
            `Viewer spike: +${pct}% (${prev.viewers} → ${curr.viewers})`, 
            Math.min(1, 0.5 + pct / 100)));
        }
        if (ratio <= this.eventThresholds.viewerDropRatio) {
          const pct = Math.round((1 - ratio) * 100);
          events.push(this.createEvent(now, "viewer_drop", "stream",
            `Viewer drop: -${pct}% (${prev.viewers} → ${curr.viewers})`,
            Math.min(1, 0.3 + pct / 100)));
        }
      }

      // Game change
      if (prev.game !== curr.game && curr.isLive) {
        events.push(this.createEvent(now, "game_change", "stream",
          `Game changed: ${prev.game} → ${curr.game}`, 0.5,
          { from: prev.game, to: curr.game }));
      }

      // Title change
      if (prev.title !== curr.title && curr.isLive && curr.title) {
        events.push(this.createEvent(now, "title_change", "stream",
          `Title changed: "${curr.title}"`, 0.3));
      }
    }

    // 2. Chat state changes
    if (this.previousChatState) {
      const prev = this.previousChatState;
      const curr = worldState.chat;

      // Chat surge
      if (curr.messagesPerMinute >= this.eventThresholds.chatSurgeRPM) {
        events.push(this.createEvent(now, "chat_surge", "chat",
          `Chat surge: ${curr.messagesPerMinute} msg/min, ${curr.uniqueChatters} chatters`,
          Math.min(1, curr.messagesPerMinute / 300)));
      }

      // Sentiment swing
      if (Math.abs(curr.sentimentScore - prev.sentimentScore) >= this.eventThresholds.sentimentSwingThreshold) {
        const direction = curr.sentimentScore > prev.sentimentScore ? "positive" : "negative";
        events.push(this.createEvent(now, "sentiment_swing", "chat",
          `Chat sentiment shifted ${direction}: ${prev.sentiment} → ${curr.sentiment}`,
          0.4));
      }

      // Toxicity spike
      if (curr.toxicityLevel === "high" && prev.toxicityLevel !== "high") {
        events.push(this.createEvent(now, "toxicity_spike", "chat",
          "Chat toxicity level HIGH", 0.7));
      }
    }

    // 3. Agent state changes
    for (const agent of worldState.agents) {
      if (agent.status === "speaking" && agent.lastActionTime > now - 5000) {
        // Agent just spoke — record as event
        events.push(this.createEvent(now, "agent_spoke", "agent",
          `${agent.name} spoke: ${agent.lastAction}`, 0.2,
          { agentId: agent.agentId, action: agent.lastAction }));
      }
    }

    // 4. Schedule events
    const hour = worldState.schedule.currentHour;
    if (hour === 0 || hour === 6 || hour === 12 || hour === 18) {
      // Hourly boundary
      events.push(this.createEvent(now, "hourly_boundary", "schedule",
        `Hour ${hour}:00 — schedule transition`, 0.3));
    }

    // Update previous state
    this.previousStreamState = { ...worldState.stream };
    this.previousChatState = { ...worldState.chat };

    return events;
  }

  /**
   * Route an event to the appropriate agent(s).
   * Returns agent IDs that should respond.
   */
  routeEvent(event: WorldEvent, agents: AgentBrain[]): string[] {
    const targets: string[] = [];

    switch (event.type) {
      case "stream_live":
      case "stream_offline":
        // Director should handle stream state changes
        targets.push(...this.findAgentsByRole(agents, "director"));
        break;

      case "viewer_spike":
      case "viewer_drop":
        // Director and analyst should respond to viewer changes
        targets.push(...this.findAgentsByRole(agents, "director"));
        targets.push(...this.findAgentsByRole(agents, "analyst"));
        break;

      case "game_change":
        // Content analyzer and analyst should respond
        targets.push(...this.findAgentsByRole(agents, "analyst"));
        targets.push(...this.findAgentsByRole(agents, "correspondent"));
        break;

      case "chat_surge":
      case "sentiment_swing":
      case "toxicity_spike":
        // Chat pulse and director should respond
        targets.push(...this.findAgentsByRole(agents, "analyst"));
        break;

      case "agent_spoke":
        // No routing needed — already handled
        break;

      case "hourly_boundary":
        // Director should handle schedule transitions
        targets.push(...this.findAgentsByRole(agents, "director"));
        break;

      default:
        // Unknown event — let director handle
        targets.push(...this.findAgentsByRole(agents, "director"));
    }

    // Deduplicate
    return [...new Set(targets)];
  }

  // --- Helpers ---

  private createEvent(
    timestamp: number,
    type: string,
    source: string,
    description: string,
    severity: number,
    metadata: Record<string, unknown> = {},
  ): WorldEvent {
    return {
      id: generateEventId(),
      timestamp,
      type,
      source,
      description,
      severity,
      metadata,
    };
  }

  private findAgentsByRole(agents: AgentBrain[], role: string): string[] {
    return agents
      .filter(a => a.role.toLowerCase().includes(role.toLowerCase()))
      .map(a => a.agentId);
  }
}