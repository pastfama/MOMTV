// ============================================================
// MOMTV Studio - Foundry Character Brain
// ============================================================
// Bridges character profiles + studio context to Azure AI Foundry
// prompt agents. Generates language-aware dialogue, movement
// decisions, and behavioral responses.
// ============================================================

import type {
  CharacterProfile,
  Studio,
  StudioZone,
  CharacterActivity,
  LanguageCode,
  Vector2,
} from "@momtv/shared";
import { AgentClient, type AgentResponse } from "../agent-client.js";

export interface CharacterDecision {
  action: CharacterActivity;
  dialogue?: {
    text: string;
    language: LanguageCode;
    emotion: string;
    duration: number;
  };
  targetZone?: string;
  reason: string;
}

export type DecisionCallback = (characterId: string, decision: CharacterDecision) => void;

export class FoundryCharacterBrain {
  private agentClient: AgentClient;
  private decisionCallbacks: DecisionCallback[] = [];
  private decisionTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor(agentClient: AgentClient) {
    this.agentClient = agentClient;
  }

  // --- Agent Invocation ---

  /** Ask the Foundry agent to decide what a character should do next */
  async decide(
    character: CharacterProfile,
    studio: Studio,
    nearbyCharacters: CharacterProfile[],
    recentEvents: string[],
  ): Promise<CharacterDecision> {
    const prompt = this.buildDecisionPrompt(character, studio, nearbyCharacters, recentEvents);

    try {
      const response = await this.invokeAgent("character-brain", prompt);
      return this.parseDecision(response.content);
    } catch (err) {
      console.warn(`[CharacterBrain] Decision failed for ${character.name}:`, err);
      return this.defaultDecision(character, studio);
    }
  }

  /** Ask the Foundry agent to generate dialogue for a character */
  async generateDialogue(
    character: CharacterProfile,
    studio: Studio,
    context: string,
    targetLanguage?: LanguageCode,
  ): Promise<{ text: string; language: LanguageCode; emotion: string }> {
    const outputLang = targetLanguage ?? studio.broadcastLanguage;
    const prompt = this.buildDialoguePrompt(character, studio, context, outputLang);

    try {
      const response = await this.invokeAgent("character-brain", prompt);
      return this.parseDialogue(response.content, outputLang);
    } catch (err) {
      console.warn(`[CharacterBrain] Dialogue gen failed for ${character.name}:`, err);
      return {
        text: this.getFallbackCatchphrase(character, outputLang),
        language: outputLang,
        emotion: "professional",
      };
    }
  }

  /** Ask the casting-director to evaluate staffing for a studio */
  async evaluateStaffing(
    studio: Studio,
    availableCharacters: CharacterProfile[],
  ): Promise<Array<{ characterId: string; jobId: string; reason: string }>> {
    const prompt = this.buildCastingPrompt(studio, availableCharacters);

    try {
      const response = await this.invokeAgent("casting-director", prompt);
      return this.parseCasting(response.content);
    } catch (err) {
      console.warn(`[CharacterBrain] Casting evaluation failed:`, err);
      return [];
    }
  }

  // --- Decision Loop ---

  /** Start periodic decision-making for a character */
  startDecisionLoop(
    characterId: string,
    character: CharacterProfile,
    studio: Studio,
    getNearby: () => CharacterProfile[],
    getEvents: () => string[],
    intervalMs: number = 30_000,
  ): void {
    this.stopDecisionLoop(characterId);

    const timer = setInterval(async () => {
      const nearby = getNearby();
      const events = getEvents();
      const decision = await this.decide(character, studio, nearby, events);

      for (const cb of this.decisionCallbacks) {
        cb(characterId, decision);
      }
    }, intervalMs);

    this.decisionTimers.set(characterId, timer);
  }

  stopDecisionLoop(characterId: string): void {
    const timer = this.decisionTimers.get(characterId);
    if (timer) {
      clearInterval(timer);
      this.decisionTimers.delete(characterId);
    }
  }

  stopAllDecisionLoops(): void {
    for (const [id] of this.decisionTimers) {
      this.stopDecisionLoop(id);
    }
  }

  onDecision(callback: DecisionCallback): void {
    this.decisionCallbacks.push(callback);
  }

  // --- Prompt Building ---

  private buildDecisionPrompt(
    character: CharacterProfile,
    studio: Studio,
    nearby: CharacterProfile[],
    events: string[],
  ): string {
    const lang = character.spokenLanguages.map(l =>
      `${l.code} (${l.proficiency}${l.accent ? `, accent: ${l.accent}` : ""})`
    ).join(", ");

    const zones = studio.floorPlan.zones.map(z =>
      `"${z.id}" (${z.name}) — allows: ${z.allowedActivities.join(", ")}`
    ).join("\n  ");

    const nearbyDesc = nearby.map(c =>
      `- ${c.name} (${c.nationality}, speaks: ${c.nativeLanguage}) at zone: ${this.getZoneForPosition(c.currentPosition, studio)}`
    ).join("\n  ");

    return `You are a character brain for MOMTV, a virtual TV network.

CHARACTER PROFILE:
- Name: ${character.name} (${character.nameLatin ?? "latin n/a"})
- Nationality: ${character.nationality}
- Languages: ${lang}
- Job: ${this.getCurrentJobTitle(character, studio)} at ${studio.name}
- Current Activity: ${JSON.stringify(character.currentActivity)}
- Mood: energy=${character.personality.mood.energy}, valence=${character.personality.mood.valence}, stress=${character.personality.mood.stress}
- Traits: ${character.personality.traits.join(", ")}

STUDIO CONTEXT:
- Studio: ${studio.name} (language: ${studio.broadcastLanguage}, genre: ${studio.brand.genre})
- Broadcast: ${studio.broadcastState.isLive ? "LIVE" : "offline"} — ${studio.broadcastState.currentShowType}
- Current camera: ${studio.broadcastState.activeCameraId}

AVAILABLE ZONES:
  ${zones}

NEARBY CHARACTERS:
  ${nearbyDesc || "  (none)"}

RECENT EVENTS:
  ${events.length > 0 ? events.join("\n  ") : "  (none)"}

LANGUAGE RULES:
- Think in ${character.nativeLanguage}
- Output dialogue in ${studio.broadcastLanguage} if you speak it at "fluent" or "native" level
- If your proficiency is "basic" or "conversational" in ${studio.broadcastLanguage}, output in ${character.nativeLanguage} and mark "[needs translation]"
- Off-air: prefer ${character.nativeLanguage}
- On-air: use ${studio.broadcastLanguage}

DECIDE the next action. Return JSON:
{
  "action": "idle" | "walking" | "working" | "talking" | "on_air" | "break",
  "dialogue": { "text": "...", "language": "${studio.broadcastLanguage}", "emotion": "professional|excited|serious|humorous|analytical", "duration": 5000 },
  "targetZone": "zone-id" | null,
  "reason": "brief explanation"
}`;
  }

  private buildDialoguePrompt(
    character: CharacterProfile,
    studio: Studio,
    context: string,
    outputLanguage: LanguageCode,
  ): string {
    const catchphrases = character.personality.catchphrases[character.nativeLanguage]?.join(", ") ?? "";
    const desc = character.personality.description[character.nativeLanguage] ?? "";

    return `You are ${character.name}, a ${character.nationality} ${this.getCurrentJobTitle(character, studio)} at ${studio.name}.

${desc}

Personality: ${character.personality.tone}. Traits: ${character.personality.traits.join(", ")}.
Catchphrases: ${catchphrases}

Context: ${context}

Speak naturally in ${outputLanguage}. Stay in character. Be concise (1-3 sentences).
${character.nativeLanguage !== outputLanguage ? `Note: Your native language is ${character.nativeLanguage}. Occasionally sprinkle in ${character.nativeLanguage} filler words for authenticity.` : ""}

Return JSON:
{ "text": "...", "emotion": "professional|excited|serious|humorous|analytical|enthusiastic|thoughtful" }`;
  }

  private buildCastingPrompt(studio: Studio, available: CharacterProfile[]): string {
    const openJobs = this.getOpenJobs(studio);
    const charList = available.map(c => {
      const skills = c.skills.map(s => `${s.name}:${s.level}`).join(", ");
      const langs = c.spokenLanguages.map(l => `${l.code}(${l.proficiency})`).join(", ");
      return `- ${c.name} [${c.nationality}] skills=[${skills}] langs=[${langs}]`;
    }).join("\n");

    return `You are the casting director for ${studio.name} (${studio.broadcastLanguage}, ${studio.brand.genre}).

OPEN JOBS:
${openJobs.map(j => `- ${j.id}: "${j.title}" (zone: ${j.zone}, on-air: ${j.isOnAir}, language: ${j.languageRequirement?.mustSpeak ?? "any"})`).join("\n")}

AVAILABLE CHARACTERS:
${charList}

Recommend the best character for each job. Consider:
1. Skill match (60%)
2. Language compliance for ${studio.broadcastLanguage} (20%)
3. Previous experience (20%)

Return JSON array:
[{ "characterId": "...", "jobId": "...", "reason": "brief explanation" }]`;
  }

  // --- Response Parsing ---

  private parseDecision(content: string): CharacterDecision {
    try {
      const json = JSON.parse(content) as {
        action?: string;
        dialogue?: { text?: string; language?: string; emotion?: string; duration?: number };
        targetZone?: string;
        reason?: string;
      };

      return {
        action: this.parseActivity(json.action ?? "idle", json.targetZone),
        dialogue: json.dialogue?.text ? {
          text: json.dialogue.text,
          language: (json.dialogue.language ?? "en") as LanguageCode,
          emotion: json.dialogue.emotion ?? "professional",
          duration: json.dialogue.duration ?? 5000,
        } : undefined,
        targetZone: json.targetZone,
        reason: json.reason ?? "Agent decision",
      };
    } catch {
      return {
        action: { type: "idle" },
        reason: "Failed to parse agent response",
      };
    }
  }

  private parseDialogue(content: string, fallbackLang: LanguageCode): { text: string; language: LanguageCode; emotion: string } {
    try {
      const json = JSON.parse(content) as { text?: string; emotion?: string };
      return {
        text: json.text ?? "...",
        language: fallbackLang,
        emotion: json.emotion ?? "professional",
      };
    } catch {
      // Try raw text
      return { text: content.slice(0, 200), language: fallbackLang, emotion: "professional" };
    }
  }

  private parseCasting(content: string): Array<{ characterId: string; jobId: string; reason: string }> {
    try {
      return JSON.parse(content) as Array<{ characterId: string; jobId: string; reason: string }>;
    } catch {
      return [];
    }
  }

  private parseActivity(action: string, targetZone?: string): CharacterActivity {
    switch (action) {
      case "walking":
        return {
          type: "walking",
          destination: { id: "", position: { x: 0, y: 0 }, connections: [] },
          path: [],
        };
      case "working":
        return { type: "working", jobId: "", taskId: "" };
      case "talking":
        return { type: "talking", targetCharacterId: "" };
      case "on_air":
        return { type: "on_air", broadcastId: "", cameraId: "" };
      case "break":
        return { type: "break" };
      default:
        return { type: "idle" };
    }
  }

  // --- Agent Invocation ---

  private async invokeAgent(agentName: string, prompt: string): Promise<AgentResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Agent timeout")), 30_000);

      this.agentClient.onResponse((response) => {
        if (response.agent === agentName) {
          clearTimeout(timeout);
          resolve(response);
        }
      });

      this.agentClient.sendCommand(agentName, prompt);
    });
  }

  // --- Helpers ---

  private getCurrentJobTitle(character: CharacterProfile, studio: Studio): string {
    const slot = studio.activeEmployees.get(character.id);
    if (!slot) return "Unassigned";
    const job = studio.jobRoster.find(j => j.id === slot.jobId);
    return job?.title ?? slot.jobId;
  }

  private getZoneForPosition(pos: Vector2, studio: Studio): string {
    for (const zone of studio.floorPlan.zones) {
      const b = zone.bounds;
      if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
        return zone.id;
      }
    }
    return "unknown";
  }

  private getOpenJobs(studio: Studio): typeof studio.jobRoster {
    const filled = new Set(Array.from(studio.activeEmployees.values()).map(s => s.jobId));
    return studio.jobRoster.filter(j => !filled.has(j.id));
  }

  private getFallbackCatchphrase(character: CharacterProfile, lang: LanguageCode): string {
    const phrases = character.personality.catchphrases[lang]
      ?? character.personality.catchphrases[character.nativeLanguage]
      ?? ["..."];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  private defaultDecision(character: CharacterProfile, studio: Studio): CharacterDecision {
    return {
      action: { type: "idle" },
      dialogue: {
        text: this.getFallbackCatchphrase(character, studio.broadcastLanguage),
        language: studio.broadcastLanguage,
        emotion: "professional",
        duration: 4000,
      },
      reason: "Fallback decision",
    };
  }
}