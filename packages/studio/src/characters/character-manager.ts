// ============================================================
// MOMTV Studio - Character Manager (Rive)
// ============================================================
// Loads and manages Rive character animations.
// Handles state machine inputs for walking, talking, emotions.
// ============================================================

import { Rive, type StateMachineInput } from "@rive-app/canvas";
import type { Agent, AgentCharacter } from "@momtv/shared";

export interface ManagedCharacter {
  agentId: string;
  rive: Rive;
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
    canvas.width = 350;
    canvas.height = 500;
    canvas.style.position = "absolute";
    canvas.style.zIndex = "5";
    canvas.id = `character-${agent.id}`;

    // Position at desk: Alex left, Sasha right
    const isAnchor = agent.role === "anchor";
    if (isAnchor) {
      canvas.style.left = "15%";
      canvas.style.bottom = "100px";
      canvas.style.transform = "scale(0.85)";
    } else {
      canvas.style.right = "15%";
      canvas.style.bottom = "100px";
      canvas.style.transform = "scale(0.85)";
    }

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (input as any).value = emotion;
    }
  }

  setAnimationState(agentId: string, state: string): void {
    const char = this.characters.get(agentId);
    if (!char) return;

    const input = char.stateMachine.find((i) => i.name === "state");
    if (input) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (input as any).value = state;
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

    const color = agent.character.color;
    const isAnchor = agent.role === "anchor";

    // === NEWS ANCHOR CHARACTER ===

    // Hair (behind head)
    ctx.fillStyle = isAnchor ? "#2c1810" : "#8B4513";
    ctx.beginPath();
    ctx.ellipse(200, 130, 65, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#f0c8a0";
    ctx.beginPath();
    ctx.arc(200, 155, 55, 0, Math.PI * 2);
    ctx.fill();

    // Hair top
    ctx.fillStyle = isAnchor ? "#2c1810" : "#8B4513";
    ctx.beginPath();
    ctx.ellipse(200, 115, 60, 30, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes (white)
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(180, 150, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(220, 150, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.arc(182, 150, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(222, 150, 6, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(184, 148, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(224, 148, 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = isAnchor ? "#2c1810" : "#8B4513";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(168, 135);
    ctx.lineTo(192, 132);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(208, 132);
    ctx.lineTo(232, 135);
    ctx.stroke();

    // Nose
    ctx.fillStyle = "#e0b090";
    ctx.beginPath();
    ctx.moveTo(200, 155);
    ctx.lineTo(195, 170);
    ctx.lineTo(205, 170);
    ctx.closePath();
    ctx.fill();

    // Mouth (smile)
    ctx.strokeStyle = "#c07060";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(200, 178, 18, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Neck
    ctx.fillStyle = "#f0c8a0";
    ctx.fillRect(188, 205, 24, 25);

    // Suit/Jacket
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(120, 230);
    ctx.lineTo(200, 220);
    ctx.lineTo(280, 230);
    ctx.lineTo(290, 420);
    ctx.lineTo(110, 420);
    ctx.closePath();
    ctx.fill();

    // Shirt collar
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(175, 225);
    ctx.lineTo(200, 260);
    ctx.lineTo(225, 225);
    ctx.closePath();
    ctx.fill();

    // Tie (for anchor) or necklace (for analyst)
    if (isAnchor) {
      ctx.fillStyle = "#e8794b";
      ctx.beginPath();
      ctx.moveTo(195, 245);
      ctx.lineTo(200, 310);
      ctx.lineTo(205, 245);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = "#gold";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(200, 235, 20, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }

    // Arms
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(80, 250, 50, 120, 15);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(270, 250, 50, 120, 15);
    ctx.fill();

    // Hands
    ctx.fillStyle = "#f0c8a0";
    ctx.beginPath();
    ctx.arc(105, 375, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(295, 375, 18, 0, Math.PI * 2);
    ctx.fill();

    // Desk shadow
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(200, 420, 140, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Name plate
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.roundRect(140, 400, 120, 35, 6);
    ctx.fill();
    ctx.fillStyle = "#e8794b";
    ctx.beginPath();
    ctx.roundRect(142, 402, 116, 31, 5);
    ctx.fill();
    ctx.fillStyle = "#1a1a2e";
    ctx.font = "bold 13px 'Noto Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(agent.name.toUpperCase(), 200, 422);
    ctx.font = "10px 'Noto Sans', sans-serif";
    ctx.fillText(agent.role.toUpperCase(), 200, 432);
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