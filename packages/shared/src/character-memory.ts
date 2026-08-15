// ============================================================
// MOMTV Shared Types - Character Memory
// ============================================================
// Per-agent memory system inspired by AI Town's memory pattern.
// Characters remember past interactions, relationships, and outcomes.
// ============================================================

// --- Interaction ---

export interface Interaction {
  timestamp: number;
  withAgent: string;
  action: string; // "pitched for airtime", "shared intel", "competed"
  outcome: "success" | "failure" | "neutral";
  dialogue: string;
  worldStateSnapshot: {
    viewers: number;
    game: string;
    sentiment: string;
  };
}

// --- Goal ---

export interface Goal {
  id: string;
  description: string;
  priority: number; // 1-10
  status: "active" | "completed" | "abandoned";
  createdAt: number;
  completedAt?: number;
  progress: number; // 0-1
}

// --- Reflection ---

export interface Reflection {
  timestamp: number;
  event: string;
  lesson: string;
  impact: number; // -1 to 1
  agents_involved: string[];
}

// --- Character Memory ---

export interface CharacterMemory {
  agentId: string;
  agentName: string;
  
  // Short-term memory (last 20 interactions)
  recentInteractions: Interaction[];
  
  // Long-term memory
  achievements: string[];
  failures: string[];
  lessons: string[];
  
  // Goals
  goals: Goal[];
  
  // Reflections
  reflections: Reflection[];
  
  // Current state
  lastAction: string;
  lastActionTime: number;
  lastSpokeWith: Record<string, number>; // agentId -> timestamp
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  totalInteractions: number;
}

// --- Relationship (from AI Town) ---

export interface CharacterRelationship {
  withAgent: string;
  sentiment: number; // -1 (enemy) to 1 (friend)
  trust: number; // 0 to 1
  respect: number; // 0 to 1
  interactions: number;
  lastSpoke: number;
  type: "rival" | "ally" | "neutral" | "mentor" | "subordinate";
  notes: string[]; // recent observations about this relationship
}

// --- Defaults ---

export function createDefaultMemory(agentId: string, agentName: string): CharacterMemory {
  return {
    agentId,
    agentName,
    recentInteractions: [],
    achievements: [],
    failures: [],
    lessons: [],
    goals: [],
    reflections: [],
    lastAction: "",
    lastActionTime: Date.now(),
    lastSpokeWith: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    totalInteractions: 0,
  };
}

// --- Memory Operations ---

export function addInteraction(
  memory: CharacterMemory,
  interaction: Interaction
): CharacterMemory {
  const updated = { ...memory };
  updated.recentInteractions = [interaction, ...updated.recentInteractions].slice(0, 20);
  updated.totalInteractions++;
  updated.lastAction = interaction.action;
  updated.lastActionTime = interaction.timestamp;
  updated.lastSpokeWith[interaction.withAgent] = interaction.timestamp;
  updated.updatedAt = Date.now();
  return updated;
}

export function addReflection(
  memory: CharacterMemory,
  reflection: Reflection
): CharacterMemory {
  const updated = { ...memory };
  updated.reflections = [reflection, ...updated.reflections].slice(0, 50);
  updated.updatedAt = Date.now();
  return updated;
}

export function updateGoal(
  memory: CharacterMemory,
  goalId: string,
  updates: Partial<Goal>
): CharacterMemory {
  const updated = { ...memory };
  updated.goals = updated.goals.map(g => 
    g.id === goalId ? { ...g, ...updates } : g
  );
  updated.updatedAt = Date.now();
  return updated;
}

export function addGoal(
  memory: CharacterMemory,
  goal: Goal
): CharacterMemory {
  const updated = { ...memory };
  updated.goals = [...updated.goals, goal];
  updated.updatedAt = Date.now();
  return updated;
}

export function getRecentContext(memory: CharacterMemory, limit: number = 5): string {
  return memory.recentInteractions
    .slice(0, limit)
    .map(i => `${i.withAgent}: ${i.action} → ${i.outcome}`)
    .join("\n");
}

export function getActiveGoals(memory: CharacterMemory): Goal[] {
  return memory.goals.filter(g => g.status === "active");
}

export function getRelationshipSummary(memory: CharacterMemory): string {
  const recent = memory.recentInteractions.slice(0, 10);
  const agents = [...new Set(recent.map(i => i.withAgent))];
  return agents.map(a => {
    const interactions = recent.filter(i => i.withAgent === a);
    const successes = interactions.filter(i => i.outcome === "success").length;
    return `${a}: ${interactions.length} interactions, ${successes} successes`;
  }).join("\n");
}