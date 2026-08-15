// ============================================================
// MOMTV Shared Types - Simulation Engine
// ============================================================
// Core simulation loop inspired by AI Town.
// Advances the MOMTV world state, routes events, and coordinates agents.
// ============================================================

import type { WorldState, WorldEvent, Transaction } from "./world-state.js";
import type { CharacterMemory, Interaction, Reflection } from "./character-memory.js";

// --- Agent Brain Interface ---

export interface AgentBrain {
  agentId: string;
  agentName: string;
  role: string;
  goals: string[];
  
  /**
   * Think: Observe world state + memory, reason about what to do.
   */
  think(worldState: WorldState, memory: CharacterMemory): AgentDecision;
  
  /**
   * Reflect: Learn from the outcome of an action.
   */
  reflect(decision: AgentDecision, outcome: "success" | "failure" | "neutral"): Reflection;
}

// --- Agent Decision ---

export interface AgentDecision {
  agentId: string;
  timestamp: number;
  action: "speak" | "pitch" | "share_intel" | "compete" | "form_alliance" | "observe" | "rest";
  targetAgent?: string;
  dialogue: string;
  reasoning: string;
  priority: number; // 1-10
  metadata: Record<string, unknown>;
}

// --- World Narrator Interface ---

export interface WorldNarrator {
  /**
   * Observe the world and generate events.
   */
  observe(worldState: WorldState): WorldEvent[];
  
  /**
   * Route an event to the appropriate agent(s).
   */
  routeEvent(event: WorldEvent, agents: AgentBrain[]): string[]; // agent IDs
}

// --- Simulation Config ---

export interface SimulationConfig {
  tickIntervalMs: number; // how often the simulation ticks
  maxAgentsPerTick: number; // max agents to process per tick
  agentCooldownMs: number; // min time between agent actions
  eventRetentionCount: number; // max events to keep in world state
  transactionRetentionCount: number; // max transactions to keep
}

// --- Default Config ---

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  tickIntervalMs: 30_000, // 30 seconds
  maxAgentsPerTick: 3, // process 3 agents per tick
  agentCooldownMs: 120_000, // 2 minutes between actions
  eventRetentionCount: 100,
  transactionRetentionCount: 500,
};

// --- Transaction ID Generator ---

let txCounter = 0;
function generateTransactionId(): string {
  txCounter++;
  return `tx_${Date.now()}_${txCounter}`;
}

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// --- World State Hash (for transactions) ---

function hashWorldState(state: WorldState): string {
  return `${state.stream.viewers}_${state.chat.sentiment}_${state.agents.length}_${state.events.length}`;
}

// --- Simulation Engine ---

export class MOMTVSimulationEngine {
  private worldState: WorldState;
  private agents: AgentBrain[] = [];
  private narrator: WorldNarrator | null = null;
  private config: SimulationConfig;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private memories: Map<string, CharacterMemory> = new Map();
  private onAction: ((decision: AgentDecision, transaction: Transaction) => void) | null = null;
  private onWorldStateUpdate: ((state: WorldState) => void) | null = null;

  constructor(
    initialState: WorldState,
    config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
  ) {
    this.worldState = initialState;
    this.config = config;
  }

  // --- Public API ---

  /**
   * Register an agent brain.
   */
  registerAgent(brain: AgentBrain): void {
    this.agents.push(brain);
  }

  /**
   * Set the world narrator.
   */
  setNarrator(narrator: WorldNarrator): void {
    this.narrator = narrator;
  }

  /**
   * Set the character memory.
   */
  setMemory(agentId: string, memory: CharacterMemory): void {
    this.memories.set(agentId, memory);
  }

  /**
   * Get the character memory.
   */
  getMemory(agentId: string): CharacterMemory | undefined {
    return this.memories.get(agentId);
  }

  /**
   * Register callback for agent actions.
   */
  onAction(callback: (decision: AgentDecision, transaction: Transaction) => void): void {
    this.onAction = callback;
  }

  /**
   * Register callback for world state updates.
   */
  onWorldStateUpdate(callback: (state: WorldState) => void): void {
    this.onWorldStateUpdate = callback;
  }

  /**
   * Update the world state with new data.
   */
  updateWorldState(updates: Partial<WorldState>): void {
    this.worldState = { ...this.worldState, ...updates, timestamp: Date.now() };
    this.onWorldStateUpdate?.(this.worldState);
  }

  /**
   * Get the current world state.
   */
  getWorldState(): WorldState {
    return this.worldState;
  }

  /**
   * Start the simulation loop.
   */
  start(): void {
    console.log(`[Simulation] Starting tick loop (every ${this.config.tickIntervalMs / 1000}s)`);
    this.tickTimer = setInterval(() => this.tick(), this.config.tickIntervalMs);
    // Run first tick immediately
    this.tick();
  }

  /**
   * Stop the simulation loop.
   */
  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    console.log("[Simulation] Stopped");
  }

  /**
   * Run a single simulation tick.
   */
  tick(): void {
    console.log(`[Simulation] Tick — ${this.worldState.agents.length} agents, ${this.worldState.events.length} events`);

    // 1. World Narrator observes and generates events
    if (this.narrator) {
      const newEvents = this.narrator.observe(this.worldState);
      for (const event of newEvents) {
        this.worldState.events.push(event);
        console.log(`[Simulation] Event: ${event.type} — ${event.description}`);
      }
      // Trim old events
      if (this.worldState.events.length > this.config.eventRetentionCount) {
        this.worldState.events = this.worldState.events.slice(-this.config.eventRetentionCount);
      }
    }

    // 2. Select agents to process (round-robin with cooldown)
    const now = Date.now();
    const eligibleAgents = this.agents.filter(agent => {
      const memory = this.memories.get(agent.agentId);
      if (!memory) return true; // no memory = always eligible
      return now - memory.lastActionTime >= this.config.agentCooldownMs;
    });

    const agentsToProcess = eligibleAgents.slice(0, this.config.maxAgentsPerTick);

    // 3. Each agent thinks, decides, and acts
    for (const agent of agentsToProcess) {
      const memory = this.memories.get(agent.agentId) || {
        agentId: agent.agentId,
        agentName: agent.agentName,
        recentInteractions: [],
        achievements: [],
        failures: [],
        lessons: [],
        goals: agent.goals.map(g => ({
          id: g,
          description: g,
          priority: 5,
          status: "active" as const,
          createdAt: now,
          progress: 0,
        })),
        reflections: [],
        lastAction: "",
        lastActionTime: 0,
        lastSpokeWith: {},
        createdAt: now,
        updatedAt: now,
        totalInteractions: 0,
      };

      // Think
      const decision = agent.think(this.worldState, memory);

      // Create transaction
      const transaction: Transaction = {
        id: generateTransactionId(),
        timestamp: now,
        agentId: agent.agentId,
        type: decision.action as Transaction["type"],
        payload: {
          dialogue: decision.dialogue,
          targetAgent: decision.targetAgent,
          reasoning: decision.reasoning,
        },
        outcome: "neutral", // will be updated after execution
        worldStateHash: hashWorldState(this.worldState),
      };

      // Record in world state
      this.worldState.recentTransactions.push(transaction);
      if (this.worldState.recentTransactions.length > this.config.transactionRetentionCount) {
        this.worldState.recentTransactions = this.worldState.recentTransactions.slice(-this.config.transactionRetentionCount);
      }

      // Update agent state
      const agentState = this.worldState.agents.find(a => a.agentId === agent.agentId);
      if (agentState) {
        agentState.status = decision.action === "rest" ? "idle" : "speaking";
        agentState.lastAction = decision.action;
        agentState.lastActionTime = now;
      }

      // Emit action
      this.onAction?.(decision, transaction);

      console.log(`[Simulation] ${agent.agentName}: ${decision.action} — "${decision.dialogue.slice(0, 50)}..."`);
    }

    // 4. Emit world state update
    this.onWorldStateUpdate?.(this.worldState);
  }

  /**
   * Process an external event (from stream watcher, chat, etc.).
   */
  processExternalEvent(event: WorldEvent): void {
    this.worldState.events.push(event);
    
    // If narrator is set, route the event
    if (this.narrator) {
      const targetAgentIds = this.narrator.routeEvent(event, this.agents);
      console.log(`[Simulation] Routing event to: ${targetAgentIds.join(", ")}`);
    }
  }
}