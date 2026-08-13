// ============================================================
// MOMTV Studio - Character Manager (Rive)
// ============================================================
// Loads and manages Rive character animations.
// Handles state machine inputs for walking, talking, emotions.
// ============================================================

import { Rive, type RiveCanvas, type StateMachineInput } from "@rive-app/canvas";
import type { Agent, AgentCharacter } from "@momtv/shared";

export interface ManagedCharacter {
  agentId: string;
  rive: RiveCanvas;
  stateMachine: StateMachineInput[];
  element: HTMLCanvasElement;
}

export class CharacterManager {
  private characters: Map<string, ManagedCharacter> = new Map();
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async loadCharacter(agent: Agent): Promise<void> {
    const rivFile = agent.character.rivFile;

    console.log(`[Characters] Loading ${agent.name} from ${rivFile}`);

    // Create a canvas for this character
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 600;
    canvas.style.position = "absolute";
    canvas.style.left = `${agent.character.position.x * 1920 - 200}px`;
    canvas.style.top = `${agent.character.position.y * 1080 - 400}px`;
    canvas.style.transform = `scale(${agent.character.scale})`;
    canvas.style.zIndex = "5";
    canvas.id = `character-${agent.id}`;

    this.container.appendChild(canvas);

    try {
      const rive = new Rive({
        src: rivFile,
        canvas,
        autoplay: true,
        stateMachines: "StateMachine",
        onLoad: () => {
          console.log(`[Characters] ${agent.name} loaded successfully`);
        },
      });

      const managed: ManagedCharacter = {
        agentId: agent.id,
        rive,
        stateMachine: [],
        element: canvas,
      };

      this.characters.set(agent.id, managed);
    } catch (err) {
      console.warn(`[Characters] Could not load ${rivFile}, using placeholder for ${agent.name}`);
      this.createPlaceholder(canvas, agent);
    }
  }

  // --- State Control ---

  setTalking(agentId: string, isTalking: boolean): void {
    const char = this.characters.get(agentId);
    if (!char) return;

    // Rive state machine input
    const input = char.stateMachine.find((i) => i.name === "talking");
    if (input) {
      input.value = isTalking;
    }

    // Fallback: CSS animation
    if (isTalking) {
      char.element.style.animation = "agent-talk 0.3s ease-in-out infinite alternate";
    } else {
      char.element.style.animation = "";
    }
  }

  setEmotion(agentId: string, emotion: string): void {
    const char = this.characters.get(agentId);
    if (!char) return;

    const input = char.stateMachine.find((i) => i.name === "emotion");
    if (input) {
      input.value = emotion;
    }
  }

  setAnimationState(agentId: string, state: string): void {
    const char = this.characters.get(agentId);
    if (!char) return;

    const input = char.stateMachine.find((i) => i.name === "state");
    if (input) {
      input.value = state;
    }
  }

  moveCharacter(agentId: string, x: number, y: number): void {
    const char = this.characters.get(agentId);
    if (!char) return;

    char.element.style.transition = "left 0.5s ease, top 0.5s ease";
    char.element.style.left = `${x * 1920 - 200}px`;
    char.element.style.top = `${y * 1080 - 400}px`;
  }

  // --- Placeholder (when .riv file not available) ---

  private createPlaceholder(canvas: HTMLCanvasElement, agent: Agent): void {
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw a simple cartoon character
    const color = agent.character.color;

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(120, 250, 160, 200, 20);
    ctx.fill();

    // Head
    ctx.fillStyle = "#f5d5c8";
    ctx.beginPath();
    ctx.arc(200, 180, 70, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.arc(178, 170, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(222, 170, 10, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(200, 190, 25, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // Arms
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(60, 270, 60, 30, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(280, 270, 60, 30, 10);
    ctx.fill();

    // Legs
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.roundRect(140, 450, 50, 100, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(210, 450, 50, 100, 10);
    ctx.fill();

    // Name badge
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(140, 240, 120, 30);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px 'Noto Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(agent.name.toUpperCase(), 200, 260);
  }

  // --- Cleanup ---

  removeCharacter(agentId: string): void {
    const char = this.characters.get(agentId);
    if (char) {
      char.rive?.stop?.();
      char.element.remove();
      this.characters.delete(agentId);
    }
  }

  removeAll(): void {
    for (const [id] of this.characters) {
      this.removeCharacter(id);
    }
  }
}