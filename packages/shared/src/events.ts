// ============================================================
// MOMTV Shared Types - Event Definitions
// ============================================================

import type {
  StudioEvent,
  AgentSpeakEvent,
  AgentMoveEvent,
  SceneChangeEvent,
  TickerUpdateEvent,
  LanguageCode,
} from "./models.js";

// --- Event Bus Channel Names ---

export const CHANNELS = {
  /** Stream analysis results */
  ANALYSIS: "momtv:analysis",
  /** Decision engine output */
  DECISIONS: "momtv:decisions",
  /** Commentary segments */
  COMMENTARY: "momtv:commentary",
  /** TTS audio output */
  TTS: "momtv:tts",
  /** Studio rendering events (WebSocket feed) */
  STUDIO: "momtv:studio",
  /** Stream status updates */
  STREAM_STATUS: "momtv:stream:status",
  /** Chat messages */
  CHAT: "momtv:chat",
  /** System health */
  HEALTH: "momtv:health",
} as const;

// --- Event Factory Functions ---

export function createAgentSpeakEvent(
  agentId: string,
  text: string,
  language: LanguageCode,
  emotion: string,
  ttsAudioUrl: string,
  duration: number,
): AgentSpeakEvent {
  return {
    type: "agent_speak",
    timestamp: Date.now(),
    data: { agentId, text, language, emotion, ttsAudioUrl, duration },
  };
}

export function createAgentMoveEvent(
  agentId: string,
  position: { x: number; y: number },
  animation: string,
): AgentMoveEvent {
  return {
    type: "agent_move",
    timestamp: Date.now(),
    data: { agentId, position, animation },
  };
}

export function createSceneChangeEvent(
  scene: SceneChangeEvent["data"]["scene"],
): SceneChangeEvent {
  return {
    type: "scene_change",
    timestamp: Date.now(),
    data: { scene },
  };
}

export function createTickerUpdateEvent(
  text: string,
  language: LanguageCode,
): TickerUpdateEvent {
  return {
    type: "ticker_update",
    timestamp: Date.now(),
    data: { text, language },
  };
}

export function createGenericStudioEvent(
  type: StudioEvent["type"],
  data: Record<string, unknown>,
): StudioEvent {
  return {
    type,
    timestamp: Date.now(),
    data,
  };
}