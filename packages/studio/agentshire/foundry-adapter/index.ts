// ============================================================
// MOMTV Foundry Adapter
// ============================================================
// Bridges MOMTV's simulation engine (WorldState + Transactions)
// to Agentshire's AgentEvent protocol, so the 3D town consumes
// our simulation events natively — without OpenClaw.
//
// Architecture:
//   MOMTVSimulationEngine (WorldState/Transaction)
//       ↓ maps to
//   AgentEvent (via WebSocket to town-frontend)
// ============================================================

import type {
  AgentEvent,
  TokenUsage,
  AgentStats,
} from "../src/contracts/events.js";
import type {
  WorldState,
  WorldEvent,
  Transaction,
} from "@momtv/shared";
import type {
  CharacterMemory,
} from "@momtv/shared";

// ── MOMTV → Agentshire agent ID mapping ──
// Maps MOMTV Foundry agent names → Agentshire NPC IDs

const MOMTV_TO_NPC: Record<string, string> = {
  "character-dmitri-volkov": "dmitri",
  "character-alex-morgan": "alex",
  "character-irina-morozova": "irina",
  "character-artem-sokolov": "artem",
  "character-sasha-taylor": "sasha",
  "character-jordan-davis": "jordan",
  "character-natalia-bondarenko": "natalia",
  "character-kirill-fedorov": "kirill",
  "director": "director",
  "casting-director": "casting-director",
  "economy-bank": "economy-bank",
  "economy-market": "economy-market",
  "fame-calculator": "fame-calculator",
  "character-factory": "character-factory",
};

function momtvAgentToNpc(agentId: string): string {
  return MOMTV_TO_NPC[agentId] ?? agentId;
}

// ── Event Factory ──

let eventCounter = 0;
function nextEventId(): string {
  return `momtv-${++eventCounter}`;
}

// ── WorldState → AgentEvent[] ──

export function worldStateToEvents(state: WorldState): AgentEvent[] {
  const events: AgentEvent[] = [];
  const ts = new Date().toISOString();

  // System init (one-shot)
  events.push({
    type: "system",
    subtype: "init",
    sessionId: `momtv-${state.timestamp}`,
    model: "gpt-4o",
    persona: `MOMTV World: ${state.stream.isLive ? "LIVE" : "OFFLINE"} — ${state.stream.viewers} viewers`,
  });

  // World controls — map time/weather from stream state
  const hour = new Date().getHours();
  events.push({
    type: "world_control",
    target: "time",
    action: "set",
    hour,
  });

  // Agent states → sub_agent events
  for (const agent of state.agents) {
    if (agent.status === "speaking" && agent.lastAction) {
      events.push({
        type: "sub_agent",
        subtype: "started",
        agentId: momtvAgentToNpc(agent.agentId),
        agentType: agent.role,
        parentToolUseId: nextEventId(),
        task: agent.lastAction,
        model: "gpt-4o",
        displayName: agent.name,
      });
    }
  }

  return events;
}

// ── Transaction → AgentEvent[] ──

export function transactionToEvent(tx: Transaction): AgentEvent[] {
  const events: AgentEvent[] = [];
  const npcId = momtvAgentToNpc(tx.agentId);
  const ts = new Date(tx.timestamp).toISOString();

  switch (tx.type) {
    case "speak":
    case "pitch":
      // NPC speech → text event (shows as dialogue bubble in town)
      if (tx.payload.dialogue) {
        events.push({
          type: "text",
          content: String(tx.payload.dialogue),
        });
      }
      break;

    case "share_intel":
      // Share intel → tool_use event
      events.push({
        type: "tool_use",
        toolUseId: tx.id,
        name: "share_intel",
        input: tx.payload as Record<string, unknown>,
      });
      // Show dialogue if available
      if (tx.payload.dialogue) {
        events.push({
          type: "text",
          content: String(tx.payload.dialogue),
        });
      }
      break;

    case "compete":
      // Competition → tool_use with result
      events.push({
        type: "tool_use",
        toolUseId: tx.id,
        name: "compete_for_airtime",
        input: tx.payload as Record<string, unknown>,
      });
      break;

    case "form_alliance":
    case "betray":
      // Social action → bus_message event
      events.push({
        type: "bus_message",
        from: npcId,
        to: tx.payload.targetAgent
          ? momtvAgentToNpc(String(tx.payload.targetAgent))
          : "director",
        summary: String(tx.payload.dialogue ?? tx.type),
        contentPreview: String(tx.payload.dialogue ?? "").slice(0, 200),
        timestamp: tx.timestamp,
      });
      break;

    case "earn_momc":
    case "spend_momc":
      // Economy → tool_result
      events.push({
        type: "tool_result",
        toolUseId: tx.id,
        name: tx.type,
        output: JSON.stringify(tx.payload),
        displayOutput: String(tx.payload.reason ?? tx.type),
      });
      break;

    default:
      // Debug catch-all for any unhandled transaction types
      events.push({
        type: "debug",
        category: "transaction",
        message: `${tx.type}: ${JSON.stringify(tx.payload).slice(0, 200)}`,
        data: { agentId: tx.agentId, txType: tx.type },
      });
  }

  return events;
}

// ── WorldEvent → AgentEvent[] ──

export function worldEventToEvent(ev: WorldEvent): AgentEvent[] {
  const events: AgentEvent[] = [];

  switch (ev.type) {
    case "stream_live":
      events.push({
        type: "text",
        content: `🔴 Stream is now LIVE — ${ev.description}`,
      });
      events.push({
        type: "world_control",
        target: "weather",
        action: "set",
        weather: "clear",
      });
      break;

    case "stream_offline":
      events.push({
        type: "text",
        content: `⚫ Stream went offline — ${ev.description}`,
      });
      events.push({
        type: "world_control",
        target: "weather",
        action: "set",
        weather: "fog",
      });
      break;

    case "viewer_spike":
      events.push({
        type: "text",
        content: `📈 Viewer spike — ${ev.description}`,
      });
      break;

    case "chat_surge":
      events.push({
        type: "text",
        content: `💬 Chat surge — ${ev.description}`,
      });
      break;

    case "game_change":
      events.push({
        type: "text",
        content: `🎮 Game changed — ${ev.description}`,
      });
      break;

    case "agent_spoke":
      events.push({
        type: "text",
        content: ev.description,
      });
      break;

    default:
      events.push({
        type: "debug",
        category: "world_event",
        message: ev.description,
      });
  }

  return events;
}

// ── Dialogue → AgentEvent (for Foundry agent output) ──

export function dialogueToEvent(
  agentId: string,
  dialogue: string,
  emotion?: string,
): AgentEvent[] {
  const npcId = momtvAgentToNpc(agentId);

  return [
    {
      type: "sub_agent",
      subtype: "started",
      agentId: npcId,
      agentType: "character",
      parentToolUseId: nextEventId(),
      task: "speaking",
      model: "gpt-4o",
    },
    {
      type: "text",
      content: dialogue,
    },
    {
      type: "sub_agent",
      subtype: "done",
      agentId: npcId,
      result: dialogue,
      toolCalls: 0,
      status: "completed",
    },
  ];
}

// ── Memory → AgentStateSnapshot ──
// Maps MOMTV character memory to Agentshire's state snapshot format

export function memoryToAgentState(
  memory: CharacterMemory,
  worldState: WorldState,
): {
  agentId: string;
  displayName: string;
  status: string;
  currentTask: string;
  recentActions: string[];
} {
  return {
    agentId: momtvAgentToNpc(memory.agentId),
    displayName: memory.agentName,
    status: memory.lastAction ? "working" : "idle",
    currentTask: memory.lastAction || "observing the world",
    recentActions: memory.recentInteractions
      .slice(0, 5)
      .map((i) => i.action),
  };
}

// ── Build full initial AgentEvent stream for town init ──

export function buildTownInitEvents(
  state: WorldState,
  memories: CharacterMemory[],
): AgentEvent[] {
  const events: AgentEvent[] = [];

  // System init
  events.push({
    type: "system",
    subtype: "init",
    sessionId: `momtv-${Date.now()}`,
    model: "gpt-4o",
    persona:
      `MOMTV World: ${state.stream.isLive ? "LIVE" : "OFFLINE"} — ` +
      `${state.stream.viewers} viewers — ${state.stream.game}`,
  });

  // Set world time
  events.push({
    type: "world_control",
    target: "time",
    action: "set",
    hour: new Date().getHours(),
  });

  // Register each character as a sub_agent
  for (const agent of state.agents) {
    events.push({
      type: "sub_agent",
      subtype: "started",
      agentId: momtvAgentToNpc(agent.agentId),
      agentType: agent.role,
      parentToolUseId: nextEventId(),
      task: agent.lastAction || "initialized",
      model: "gpt-4o",
      displayName: agent.name,
    });

    // Show initial status as text
    events.push({
      type: "text",
      content: `${agent.name} (${agent.role}) — mood: ${agent.mood}, fame: ${agent.fame}`,
    });
  }

  return events;
}

// ── Full simulation tick → AgentEvent[] ──

export function tickToEvents(
  state: WorldState,
  newTransactions: Transaction[],
  newWorldEvents: WorldEvent[],
): AgentEvent[] {
  const events: AgentEvent[] = [];

  // Map new world events
  for (const worldEvent of newWorldEvents) {
    events.push(...worldEventToEvent(worldEvent));
  }

  // Map new transactions
  for (const tx of newTransactions) {
    events.push(...transactionToEvent(tx));
  }

  // Update time
  events.push({
    type: "world_control",
    target: "time",
    action: "set",
    hour: new Date().getHours(),
  });

  return events;
}