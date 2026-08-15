// ============================================================
// MOMTV Shared Types - World State
// ============================================================
// Unified world state that all agents observe.
// Inspired by AI Town's shared global state pattern.
// ============================================================

import type { StreamEvent, ChatRateMetrics } from "./models.js";

// --- Stream State ---

export interface StreamState {
  isLive: boolean;
  viewers: number;
  game: string;
  title: string;
  startedAt: string | null;
  uptime: number; // seconds since stream started
}

// --- Chat State ---

export interface ChatState {
  sentiment: "positive" | "negative" | "neutral" | "mixed" | "excited" | "toxic";
  sentimentScore: number; // 0-1
  messagesPerMinute: number;
  uniqueChatters: number;
  trending: string[];
  recentMessages: string[];
  toxicityLevel: "none" | "low" | "medium" | "high";
}

// --- Agent State ---

export interface AgentState {
  agentId: string;
  name: string;
  role: string;
  status: "speaking" | "thinking" | "idle" | "competing" | "alliance";
  lastAction: string;
  lastActionTime: number;
  goals: string[];
  mood: string;
  fame: number;
  airtimeMinutes: number;
}

// --- Schedule State ---

export interface ScheduleState {
  currentStudio: string;
  currentHour: number;
  isPrimetime: boolean;
  nextSlotIn: number; // seconds until next slot
  studiosOnAir: string[];
}

// --- Economy State ---

export interface EconomyState {
  totalSupply: number;
  inflationRate: number;
  prices: Record<string, number>;
}

// --- Event ---

export interface WorldEvent {
  id: string;
  timestamp: number;
  type: string;
  source: string;
  description: string;
  severity: number; // 0-1
  metadata: Record<string, unknown>;
}

// --- Relationship Graph ---

export interface RelationshipEdge {
  from: string;
  to: string;
  sentiment: number; // -1 to 1
  trust: number; // 0 to 1
  interactions: number;
  lastSpoke: number;
  type: "rival" | "ally" | "neutral" | "mentor" | "subordinate";
}

// --- World State ---

export interface WorldState {
  timestamp: number;
  stream: StreamState;
  chat: ChatState;
  agents: AgentState[];
  events: WorldEvent[];
  schedule: ScheduleState;
  economy: EconomyState;
  relationships: RelationshipEdge[];
  recentTransactions: Transaction[];
}

// --- Transaction (AI Town pattern) ---

export interface Transaction {
  id: string;
  timestamp: number;
  agentId: string;
  type: "speak" | "pitch" | "share_intel" | "compete" | "form_alliance" | "betray" | "earn_momc" | "spend_momc";
  payload: Record<string, unknown>;
  outcome: "success" | "failure" | "neutral";
  worldStateHash: string;
}

// --- Defaults ---

export function createDefaultWorldState(): WorldState {
  return {
    timestamp: Date.now(),
    stream: {
      isLive: false,
      viewers: 0,
      game: "Unknown",
      title: "",
      startedAt: null,
      uptime: 0,
    },
    chat: {
      sentiment: "neutral",
      sentimentScore: 0.5,
      messagesPerMinute: 0,
      uniqueChatters: 0,
      trending: [],
      recentMessages: [],
      toxicityLevel: "none",
    },
    agents: [],
    events: [],
    schedule: {
      currentStudio: "",
      currentHour: new Date().getUTCHours(),
      isPrimetime: false,
      nextSlotIn: 0,
      studiosOnAir: [],
    },
    economy: {
      totalSupply: 0,
      inflationRate: 0,
      prices: {},
    },
    relationships: [],
    recentTransactions: [],
  };
}