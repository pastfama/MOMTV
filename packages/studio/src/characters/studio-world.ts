// ============================================================
// MOMTV Studio - Studio World Renderer
// ============================================================
// Renders the studio floor plan on an HTML5 Canvas:
// zones, set pieces, cameras, and animated characters.
// ============================================================

import type {
  CharacterProfile,
  Studio,
  StudioZone,
  CameraPosition,
  StudioSet,
  Vector2,
  Direction,
} from "@momtv/shared";
import { CharacterNavigator } from "./character-navigator.js";

interface RenderedCharacter {
  profile: CharacterProfile;
  x: number;
  y: number;
  direction: Direction;
  animation: string;
  isTalking: boolean;
  emotion: string;
  label: string;
}

export class StudioWorld {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private studio: Studio;
  private navigator: CharacterNavigator;
  private characters: Map<string, RenderedCharacter> = new Map();
  private activeCamera: CameraPosition;
  private animFrameId: number | null = null;

  // Visual config
  private readonly FONT = "12px 'Noto Sans', Arial, sans-serif";
  private readonly FONT_BOLD = "bold 13px 'Noto Sans', Arial, sans-serif";

  constructor(container: HTMLElement, studio: Studio) {
    this.studio = studio;
    this.navigator = new CharacterNavigator(studio.floorPlan.zones);

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = studio.floorPlan.width;
    this.canvas.height = studio.floorPlan.height;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "1";
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d")!;
    this.activeCamera = studio.floorPlan.cameras.find(c => c.activeByDefault)
      ?? studio.floorPlan.cameras[0];
  }

  // --- Character Management ---

  addCharacter(profile: CharacterProfile): void {
    this.characters.set(profile.id, {
      profile,
      x: profile.currentPosition.x,
      y: profile.currentPosition.y,
      direction: profile.currentFacing,
      animation: "idle",
      isTalking: false,
      emotion: "",
      label: profile.nameLatin ?? profile.name,
    });
  }

  removeCharacter(characterId: string): void {
    this.characters.delete(characterId);
    this.navigator.cancelWalk(characterId);
  }

  /** Move a character to walk toward a zone */
  walkToZone(characterId: string, zoneId: string): void {
    const char = this.characters.get(characterId);
    if (!char) return;

    const path = this.navigator.findPathToZone({ x: char.x, y: char.y }, zoneId);
    if (!path) {
      console.warn(`[StudioWorld] No path from ${char.x},${char.y} to zone ${zoneId}`);
      return;
    }

    this.navigator.startWalk(characterId, path, () => {
      // Walk complete — update character activity
      const c = this.characters.get(characterId);
      if (c) {
        c.animation = "idle";
      }
    });
  }

  /** Move a character to a specific position (nearest waypoint) */
  walkToPosition(characterId: string, targetPosition: Vector2): void {
    const char = this.characters.get(characterId);
    if (!char) return;

    const nearestWp = this.navigator.findNearestWaypoint({ x: char.x, y: char.y });
    const targetWp = this.navigator.findNearestWaypoint(targetPosition);
    if (!nearestWp || !targetWp) return;

    const path = this.navigator.findPath(nearestWp.id, targetWp.id);
    if (!path) return;

    this.navigator.startWalk(characterId, path);
  }

  setTalking(characterId: string, isTalking: boolean): void {
    const char = this.characters.get(characterId);
    if (char) char.isTalking = isTalking;
  }

  setEmotion(characterId: string, emotion: string): void {
    const char = this.characters.get(characterId);
    if (char) char.emotion = emotion;
  }

  // --- Camera ---

  switchCamera(cameraId: string): void {
    const cam = this.studio.floorPlan.cameras.find(c => c.id === cameraId);
    if (cam) {
      this.activeCamera = cam;
      this.studio.broadcastState.activeCameraId = cameraId;
    }
  }

  getActiveCamera(): CameraPosition {
    return this.activeCamera;
  }

  // --- Rendering ---

  startRendering(): void {
    const render = () => {
      this.render();
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  stopRendering(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const { width, height } = this.studio.floorPlan;

    // Apply camera transform
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = this.studio.floorPlan.background;
    ctx.fillRect(0, 0, width, height);

    // Apply camera zoom/pan
    const cam = this.activeCamera;
    const zoom = cam.zoom;
    const offsetX = width / 2 - cam.focus.x * zoom;
    const offsetY = height / 2 - cam.focus.y * zoom;
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);

    // Draw zones
    this.renderZones(ctx);

    // Draw sets
    this.renderSets(ctx);

    // Draw waypoints (debug)
    this.renderWaypoints(ctx);

    // Update character positions from navigator
    this.updateCharacterPositions();

    // Draw characters
    this.renderCharacters(ctx);

    ctx.restore();

    // Draw camera overlay (outside camera transform)
    this.renderOverlay(ctx);
  }

  private renderZones(ctx: CanvasRenderingContext2D): void {
    for (const zone of this.studio.floorPlan.zones) {
      const { x, y, w, h } = zone.bounds;

      // Zone fill
      const isActive = zone.allowedActivities.includes("on_air") || zone.allowedActivities.includes("working");
      ctx.fillStyle = isActive ? "rgba(232, 121, 75, 0.08)" : "rgba(255, 255, 255, 0.03)";
      ctx.fillRect(x, y, w, h);

      // Zone border
      ctx.strokeStyle = isActive ? "rgba(232, 121, 75, 0.25)" : "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      // Zone label
      const label = zone.label.en ?? zone.name;
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = this.FONT;
      ctx.textAlign = "left";
      ctx.fillText(label.toUpperCase(), x + 8, y + 16);
    }
  }

  private renderSets(ctx: CanvasRenderingContext2D): void {
    for (const setPiece of this.studio.floorPlan.sets) {
      const { x, y } = setPiece.position;
      const { w, h } = setPiece.size;

      // Set piece background
      ctx.fillStyle = "rgba(26, 26, 46, 0.8)";
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();

      // Set piece border
      ctx.strokeStyle = "rgba(232, 121, 75, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Set piece name
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = this.FONT;
      ctx.textAlign = "center";
      ctx.fillText(setPiece.name, x + w / 2, y + h / 2 + 4);
    }
  }

  private renderWaypoints(ctx: CanvasRenderingContext2D): void {
    // Small dots at waypoint positions for debugging
    ctx.globalAlpha = 0.3;
    for (const zone of this.studio.floorPlan.zones) {
      for (const wp of zone.waypoints) {
        // Draw connections
        for (const connId of wp.connections) {
          const connWp = this.findWaypointById(connId);
          if (connWp) {
            ctx.strokeStyle = "rgba(59, 130, 246, 0.15)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(wp.position.x, wp.position.y);
            ctx.lineTo(connWp.position.x, connWp.position.y);
            ctx.stroke();
          }
        }

        // Draw waypoint dot
        ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
        ctx.beginPath();
        ctx.arc(wp.position.x, wp.position.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private renderCharacters(ctx: CanvasRenderingContext2D): void {
    // Sort by Y for depth ordering
    const sorted = Array.from(this.characters.values()).sort((a, b) => a.y - b.y);

    for (const char of sorted) {
      this.renderSingleCharacter(ctx, char);
    }
  }

  private renderSingleCharacter(ctx: CanvasRenderingContext2D, char: RenderedCharacter): void {
    const { x, y } = char;
    const color = char.profile.appearance.color;
    const isTalking = char.isTalking;
    const walking = char.animation === "walking";

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(x, y + 45, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body bounce for walking
    const bounce = walking ? Math.sin(Date.now() / 120) * 3 : 0;

    // Legs (for walking animation)
    if (walking) {
      const legPhase = Math.sin(Date.now() / 150);
      ctx.fillStyle = "#2d2d44";
      ctx.beginPath();
      ctx.roundRect(x - 10, y + 25 + bounce, 8, 18 + legPhase * 4, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 25 + bounce, 8, 18 - legPhase * 4, 3);
      ctx.fill();
    } else {
      // Standing legs
      ctx.fillStyle = "#2d2d44";
      ctx.beginPath();
      ctx.roundRect(x - 10, y + 25, 8, 18, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 25, 8, 18, 3);
      ctx.fill();
    }

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - 14, y - 10 + bounce, 28, 38, 6);
    ctx.fill();

    // Head
    ctx.fillStyle = "#f0c8a0";
    ctx.beginPath();
    ctx.arc(x, y - 22 + bounce, 14, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    const isDark = char.profile.nationality === "russian" || char.profile.nationality === "ukrainian";
    ctx.fillStyle = isDark ? "#2c1810" : "#8B4513";
    ctx.beginPath();
    ctx.ellipse(x, y - 30 + bounce, 15, 8, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes
    const eyeOffset = walking ? (char.direction === "east" ? 2 : char.direction === "west" ? -2 : 0) : 0;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(x - 5 + eyeOffset, y - 23 + bounce, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 5 + eyeOffset, y - 23 + bounce, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.arc(x - 4.5 + eyeOffset, y - 23 + bounce, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 5.5 + eyeOffset, y - 23 + bounce, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Talking mouth animation
    if (isTalking) {
      const mouthOpen = Math.sin(Date.now() / 80) * 2 + 2;
      ctx.fillStyle = "#c07060";
      ctx.beginPath();
      ctx.ellipse(x, y - 14 + bounce, 4, mouthOpen, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Name label
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    const labelText = char.label;
    ctx.font = this.FONT_BOLD;
    const textWidth = ctx.measureText(labelText).width;
    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - 6, y + 46, textWidth + 12, 18, 4);
    ctx.fill();

    ctx.fillStyle = "#e8794b";
    ctx.textAlign = "center";
    ctx.fillText(labelText, x, y + 59);

    // Emotion indicator
    if (char.emotion && char.emotion !== "") {
      const emotionIcons: Record<string, string> = {
        excited: "🔥",
        serious: "⚠️",
        humorous: "😄",
        professional: "📰",
        thoughtful: "🤔",
        enthusiastic: "⭐",
        analytical: "📊",
      };
      const icon = emotionIcons[char.emotion] ?? "💬";
      ctx.font = "16px sans-serif";
      ctx.fillText(icon, x, y - 40 + bounce);
    }
  }

  private renderOverlay(ctx: CanvasRenderingContext2D): void {
    // Camera name overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.roundRect(8, 8, 180, 28, 6);
    ctx.fill();

    ctx.fillStyle = "#e8794b";
    ctx.font = this.FONT_BOLD;
    ctx.textAlign = "left";
    ctx.fillText(`📹 ${this.activeCamera.name}`, 16, 27);

    // Studio name
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.roundRect(this.canvas.width - 200, 8, 192, 28, 6);
    ctx.fill();

    ctx.fillStyle = "#e8794b";
    ctx.font = this.FONT_BOLD;
    ctx.textAlign = "right";
    ctx.fillText(this.studio.name, this.canvas.width - 16, 27);

    // Broadcast state indicator
    if (this.studio.broadcastState.isLive) {
      ctx.fillStyle = "rgba(220, 38, 38, 0.8)";
      ctx.beginPath();
      ctx.roundRect(this.canvas.width / 2 - 30, 8, 60, 24, 4);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = this.FONT_BOLD;
      ctx.textAlign = "center";
      ctx.fillText("● LIVE", this.canvas.width / 2, 25);
    }

    // Character count
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.roundRect(8, this.canvas.height - 36, 140, 28, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = this.FONT;
    ctx.textAlign = "left";
    ctx.fillText(`👥 ${this.characters.size} characters`, 16, this.canvas.height - 17);
  }

  // --- Internal ---

  private updateCharacterPositions(): void {
    const positions = this.navigator.getAllActivePositions();
    for (const [charId, pos] of positions) {
      const char = this.characters.get(charId);
      if (char) {
        char.x = pos.position.x;
        char.y = pos.position.y;
        char.direction = pos.direction;
        char.animation = pos.animation;
      }
    }
  }

  private findWaypointById(id: string): { position: Vector2 } | null {
    for (const zone of this.studio.floorPlan.zones) {
      for (const wp of zone.waypoints) {
        if (wp.id === id) return wp;
      }
    }
    return null;
  }

  // --- Cleanup ---

  destroy(): void {
    this.stopRendering();
    this.canvas.remove();
  }
}