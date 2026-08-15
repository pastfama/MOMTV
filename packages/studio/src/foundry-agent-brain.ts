// ============================================================
// MOMTV — Foundry Agent Brain (MC-CIV Pattern)
// ============================================================
// Wraps a Foundry prompt agent as an AgentBrain.
// Implements Think → Decide → Act → Reflect pattern.
// ============================================================

import type {
  WorldState,
  CharacterMemory,
  AgentBrain,
  AgentDecision,
  Reflection,
} from "@momtv/shared";

// --- Foundry Agent Brain ---

export class FoundryAgentBrain implements AgentBrain {
  agentId: string;
  agentName: string;
  role: string;
  goals: string[];
  
  private projectId: string;
  private language: string;
  private personality: string;

  constructor(config: {
    agentId: string;
    agentName: string;
    role: string;
    goals: string[];
    projectId: string;
    language?: string;
    personality?: string;
  }) {
    this.agentId = config.agentId;
    this.agentName = config.agentName;
    this.role = config.role;
    this.goals = config.goals;
    this.projectId = config.projectId;
    this.language = config.language || "Russian";
    this.personality = config.personality || "";
  }

  /**
   * Think: Observe world state + memory, reason about what to do.
   * Returns an AgentDecision with action, dialogue, and reasoning.
   */
  think(worldState: WorldState, memory: CharacterMemory): AgentDecision {
    const now = Date.now();
    
    // Build context for the LLM
    const context = this.buildContext(worldState, memory);
    
    // For now, return a basic decision based on rules
    // In production, this would call the Foundry agent
    const decision = this.ruleBasedThink(worldState, memory, context);
    
    return {
      agentId: this.agentId,
      timestamp: now,
      action: decision.action,
      targetAgent: decision.targetAgent,
      dialogue: decision.dialogue,
      reasoning: decision.reasoning,
      priority: decision.priority,
      metadata: {
        language: this.language,
        worldViewers: worldState.stream.viewers,
        worldGame: worldState.stream.game,
        recentInteractions: memory.recentInteractions.length,
        activeGoals: memory.goals.filter(g => g.status === "active").length,
      },
    };
  }

  /**
   * Reflect: Learn from the outcome of an action.
   */
  reflect(decision: AgentDecision, outcome: "success" | "failure" | "neutral"): Reflection {
    const lesson = outcome === "success" 
      ? `${decision.action} worked well — ${decision.reasoning}`
      : outcome === "failure"
        ? `${decision.action} failed — need to try different approach`
        : `${decision.action} had neutral outcome — observe further`;

    return {
      timestamp: Date.now(),
      event: `${decision.action}: "${decision.dialogue.slice(0, 50)}..."`,
      lesson,
      impact: outcome === "success" ? 0.5 : outcome === "failure" ? -0.3 : 0,
      agents_involved: decision.targetAgent ? [decision.targetAgent] : [],
    };
  }

  // --- Internal ---

  private buildContext(worldState: WorldState, memory: CharacterMemory): string {
    const parts: string[] = [];

    // Stream state
    parts.push(`STREAM: ${worldState.stream.isLive ? "LIVE" : "OFFLINE"} — ${worldState.stream.viewers} viewers — ${worldState.stream.game}`);
    if (worldState.stream.title) parts.push(`Title: ${worldState.stream.title}`);

    // Chat state
    parts.push(`CHAT: ${worldState.chat.sentiment} (${(worldState.chat.sentimentScore * 100).toFixed(0)}%) — ${worldState.chat.messagesPerMinute} msg/min`);
    if (worldState.chat.trending.length > 0) {
      parts.push(`Trending: ${worldState.chat.trending.slice(0, 3).join(", ")}`);
    }

    // Recent events
    const recentEvents = worldState.events.slice(-5);
    if (recentEvents.length > 0) {
      parts.push(`RECENT EVENTS:`);
      for (const event of recentEvents) {
        parts.push(`  - ${event.type}: ${event.description}`);
      }
    }

    // Other agents
    const otherAgents = worldState.agents.filter(a => a.agentId !== this.agentId);
    if (otherAgents.length > 0) {
      parts.push(`OTHER AGENTS:`);
      for (const agent of otherAgents.slice(0, 5)) {
        parts.push(`  - ${agent.name} (${agent.role}): ${agent.status} — last: ${agent.lastAction || "none"}`);
      }
    }

    // Memory context
    if (memory.recentInteractions.length > 0) {
      parts.push(`MY RECENT INTERACTIONS:`);
      for (const interaction of memory.recentInteractions.slice(0, 3)) {
        parts.push(`  - ${interaction.action} with ${interaction.withAgent}: ${interaction.outcome}`);
      }
    }

    // Active goals
    const activeGoals = memory.goals.filter(g => g.status === "active");
    if (activeGoals.length > 0) {
      parts.push(`MY GOALS:`);
      for (const goal of activeGoals) {
        parts.push(`  - ${goal.description} (priority: ${goal.priority})`);
      }
    }

    // Recent reflections
    if (memory.reflections.length > 0) {
      parts.push(`LESSONS LEARNED:`);
      for (const reflection of memory.reflections.slice(0, 2)) {
        parts.push(`  - ${reflection.lesson}`);
      }
    }

    return parts.join("\n");
  }

  private ruleBasedThink(
    worldState: WorldState,
    memory: CharacterMemory,
    context: string,
  ): {
    action: AgentDecision["action"];
    targetAgent?: string;
    dialogue: string;
    reasoning: string;
    priority: number;
  } {
    const now = Date.now();
    const timeSinceLastAction = now - memory.lastActionTime;
    const activeGoals = memory.goals.filter(g => g.status === "active");

    // Rule 1: If stream just went live, announce it
    const liveEvent = worldState.events.find(e => 
      e.type === "stream_live" && e.timestamp > now - 60_000
    );
    if (liveEvent && this.role.includes("anchor")) {
      return {
        action: "speak",
        dialogue: `Breaking news! The stream is now LIVE with ${worldState.stream.game}!`,
        reasoning: "Stream just went live — need to announce it",
        priority: 8,
      };
    }

    // Rule 2: If viewer spike, comment on it
    const spikeEvent = worldState.events.find(e => 
      e.type === "viewer_spike" && e.timestamp > now - 60_000
    );
    if (spikeEvent && this.role.includes("analyst")) {
      return {
        action: "speak",
        dialogue: `Viewer spike detected! We're seeing ${worldState.stream.viewers} viewers now.`,
        reasoning: "Viewer spike — analyze and comment",
        priority: 7,
      };
    }

    // Rule 3: If chat is excited, engage with it
    if (worldState.chat.sentiment === "excited" && worldState.chat.messagesPerMinute > 50) {
      return {
        action: "speak",
        dialogue: `Chat is going WILD! The energy is incredible right now!`,
        reasoning: "High chat engagement — engage with the audience",
        priority: 6,
      };
    }

    // Rule 4: If it's been a while since last action, do something
    if (timeSinceLastAction > 300_000 && activeGoals.length > 0) {
      const topGoal = activeGoals.sort((a, b) => b.priority - a.priority)[0];
      return {
        action: "pitch",
        dialogue: `I have an idea for our next segment based on ${worldState.stream.game}...`,
        reasoning: `Haven't acted in ${Math.round(timeSinceLastAction / 60_000)} min — pursuing goal: ${topGoal.description}`,
        priority: 5,
      };
    }

    // Rule 5: If another agent just spoke, respond
    const recentAgentSpoke = worldState.events.find(e => 
      e.type === "agent_spoke" && e.timestamp > now - 30_000 && 
      e.metadata?.agentId !== this.agentId
    );
    if (recentAgentSpoke) {
      return {
        action: "speak",
        dialogue: `Great point! Let me add to that...`,
        reasoning: "Responding to another agent's contribution",
        targetAgent: recentAgentSpoke.metadata?.agentId as string,
        priority: 4,
      };
    }

    // Default: observe silently
    return {
      action: "observe",
      dialogue: "",
      reasoning: "No urgent events — observing the world",
      priority: 1,
    };
  }
}

// --- Factory Function ---

export function createFoundryAgentBrain(config: {
  agentId: string;
  agentName: string;
  role: string;
  goals: string[];
  projectId?: string;
  language?: string;
  personality?: string;
}): FoundryAgentBrain {
  return new FoundryAgentBrain({
    ...config,
    projectId: config.projectId || "resilient-steering-dev",
  });
}