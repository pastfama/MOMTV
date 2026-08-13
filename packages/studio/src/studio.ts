// ============================================================
// MOMTV Studio - Main Studio Renderer
// ============================================================
// Orchestrates the virtual TV studio: PixiJS background,
// Rive characters, UI overlays, speech bubbles.
// ============================================================

import type {
  Agent,
  StudioEvent,
  AgentSpeakEvent,
  SceneChangeEvent,
  TickerUpdateEvent,
  AgentMoveEvent,
} from "@momtv/shared";
import { CharacterManager } from "./characters/character-manager.js";
import { StudioWSClient } from "./ws-client.js";

export class Studio {
  private wsClient: StudioWSClient;
  private characterManager: CharacterManager;
  private agents: Agent[] = [];
  private audioElement: HTMLAudioElement | null = null;

  constructor() {
    this.wsClient = new StudioWSClient();
    this.characterManager = new CharacterManager(
      document.getElementById("studio-container")!,
    );
  }

  async init(): Promise<void> {
    console.log("[Studio] Initializing MOMTV Studio...");

    // Connect to backend
    this.wsClient.connect();
    this.setupEventHandlers();

    // Fetch agent list
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        this.agents = (await res.json()) as Agent[];
        await this.loadAgents();
      }
    } catch {
      console.log("[Studio] Could not fetch agents, using defaults");
      this.agents = this.getDefaultAgents();
      await this.loadAgents();
    }

    console.log("[Studio] Studio initialized");
  }

  // --- Agent Loading ---

  private async loadAgents(): Promise<void> {
    const agentList = document.getElementById("agent-list");
    if (agentList) {
      agentList.innerHTML = "";
      for (const agent of this.agents) {
        const item = document.createElement("div");
        item.className = "agent-item";
        item.innerHTML = `
          <div class="agent-dot" style="background: ${agent.character.color}"></div>
          <div>
            <div>${agent.name}</div>
            <div class="agent-role">${agent.role}</div>
          </div>
        `;
        agentList.appendChild(item);
      }
    }

    // Load Rive characters
    for (const agent of this.agents) {
      await this.characterManager.loadCharacter(agent);
    }

    // Update agent count
    const countEl = document.getElementById("agent-count");
    if (countEl) {
      countEl.textContent = `${this.agents.length} AGENT${this.agents.length !== 1 ? "S" : ""}`;
    }
  }

  // --- Event Handlers ---

  private setupEventHandlers(): void {
    // Agent speaking
    this.wsClient.on("agent_speak", (event) => {
      this.handleAgentSpeak(event as AgentSpeakEvent);
    });

    // Scene change
    this.wsClient.on("scene_change", (event) => {
      this.handleSceneChange(event as SceneChangeEvent);
    });

    // Ticker update
    this.wsClient.on("ticker_update", (event) => {
      this.handleTickerUpdate(event as TickerUpdateEvent);
    });

    // Agent movement
    this.wsClient.on("agent_move", (event) => {
      this.handleAgentMove(event as AgentMoveEvent);
    });

    // Banner show/hide
    this.wsClient.on("banner_show", () => {
      const banner = document.getElementById("breaking-banner");
      banner?.classList.add("visible");
    });

    this.wsClient.on("banner_hide", () => {
      const banner = document.getElementById("breaking-banner");
      banner?.classList.remove("visible");
    });

    // State sync (initial load)
    this.wsClient.on("state_sync", (event) => {
      console.log("[Studio] State sync received:", event.data);
    });
  }

  // --- Event Processing ---

  private handleAgentSpeak(event: AgentSpeakEvent): void {
    const { agentId, text, emotion, ttsAudioUrl, duration } = event.data;

    console.log(`[Studio] ${agentId} speaking: "${text.slice(0, 50)}..."`);

    // Show speech bubble
    const bubble = document.getElementById(`speech-bubble-${agentId}`);
    if (bubble) {
      bubble.textContent = text;
      bubble.classList.add("visible");

      // Hide after duration
      setTimeout(() => {
        bubble.classList.remove("visible");
      }, Math.max(duration, 3000));
    }

    // Set character to talking state
    this.characterManager.setTalking(agentId, true);
    this.characterManager.setEmotion(agentId, emotion);

    // Stop talking after duration
    setTimeout(() => {
      this.characterManager.setTalking(agentId, false);
    }, duration);

    // Play TTS audio if available
    if (ttsAudioUrl) {
      this.playAudio(ttsAudioUrl);
    }

    // Update ticker with what they said
    this.updateTicker(`[${this.getAgentName(agentId)}] ${text}`);
  }

  private handleSceneChange(event: SceneChangeEvent): void {
    const { scene } = event.data;

    console.log(`[Studio] Scene change: ${scene.type}`);

    // Show/hide breaking news banner
    const banner = document.getElementById("breaking-banner");
    if (scene.type === "breaking_news") {
      banner?.classList.add("visible");
      if (scene.title) {
        banner!.textContent = scene.title;
      }
      // Auto-hide after 10 seconds
      setTimeout(() => {
        banner?.classList.remove("visible");
      }, 10_000);
    } else {
      banner?.classList.remove("visible");
    }
  }

  private handleTickerUpdate(event: TickerUpdateEvent): void {
    this.updateTicker(event.data.text);
  }

  private handleAgentMove(event: AgentMoveEvent): void {
    const { agentId, position, animation } = event.data;
    this.characterManager.moveCharacter(agentId, position.x, position.y);
    this.characterManager.setAnimationState(agentId, animation);
  }

  // --- UI Helpers ---

  private updateTicker(text: string): void {
    const ticker = document.getElementById("ticker-content");
    if (ticker) {
      ticker.textContent = text;
    }
  }

  private async playAudio(url: string): Promise<void> {
    try {
      if (this.audioElement) {
        this.audioElement.pause();
      }
      this.audioElement = new Audio(url);
      await this.audioElement.play();
    } catch {
      // Audio playback may fail in certain contexts
    }
  }

  private getAgentName(agentId: string): string {
    return this.agents.find((a) => a.id === agentId)?.name ?? agentId;
  }

  private getDefaultAgents(): Agent[] {
    return [
      {
        id: "alex",
        name: "Alex",
        role: "anchor",
        languages: ["en", "ru"],
        personality: {
          tone: "professional",
          expertise: ["gaming"],
          catchphrases: { en: ["Breaking news!"] },
          description: { en: "Anchor" },
        },
        character: {
          rivFile: "",
          color: "#3b82f6",
          position: { x: 0.35, y: 0.55 },
          scale: 1.0,
          states: { idle: "Idle", talking: "Talking", walking: "Walking", excited: "Excited", thinking: "Thinking", pointing: "Pointing" },
        },
        voice: { provider: "azure-speech", voices: { en: { male: "en-US-GuyNeural", female: "en-US-JennyNeural" } } },
      },
      {
        id: "sasha",
        name: "Sasha",
        role: "analyst",
        languages: ["en", "ru"],
        personality: {
          tone: "enthusiastic",
          expertise: ["analysis"],
          catchphrases: { en: ["The data tells us..."] },
          description: { en: "Analyst" },
        },
        character: {
          rivFile: "",
          color: "#ef4444",
          position: { x: 0.65, y: 0.55 },
          scale: 1.0,
          states: { idle: "Idle", talking: "Talking", walking: "Walking", excited: "Excited", thinking: "Thinking", pointing: "Pointing" },
        },
        voice: { provider: "azure-speech", voices: { en: { male: "en-US-GuyNeural", female: "en-US-JennyNeural" } } },
      },
    ];
  }
}