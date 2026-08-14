// ============================================================
// MOMTV Shared Types - Core Data Models
// ============================================================

// --- Language & Localization ---

export type LanguageCode = "en" | "ru" | "uk" | "de" | "fr" | "es" | "pt" | "ja" | "ko" | "zh";

export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  nameEn: string;
  whisperLanguage: string;
  ttsVoiceIds: {
    male: string;
    female: string;
  };
  uiFont: string;
  chatPatterns: RegExp[];
}

const _lang: LanguageConfig = { code: "en", name: "", nameEn: "", whisperLanguage: "", ttsVoiceIds: { male: "", female: "" }, uiFont: "", chatPatterns: [] };

export const SUPPORTED_LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  en: { code: "en", name: "English", nameEn: "English", whisperLanguage: "en", ttsVoiceIds: { male: "en-US-GuyNeural", female: "en-US-JennyNeural" }, uiFont: "Noto Sans", chatPatterns: [/breaking/i, /omg/, /lol/, /hype/] },
  ru: { code: "ru", name: "Русский", nameEn: "Russian", whisperLanguage: "ru", ttsVoiceIds: { male: "ru-RU-DmitryNeural", female: "ru-RU-SvetlanaNeural" }, uiFont: "Noto Sans", chatPatterns: [/срочно/i, /ого/, /лол/, /хайп/] },
  uk: { code: "uk", name: "Українська", nameEn: "Ukrainian", whisperLanguage: "uk", ttsVoiceIds: { male: "uk-UA-PavloNeural", female: "uk-UA-PolinaNeural" }, uiFont: "Noto Sans", chatPatterns: [/терміново/i, /ого/, /лол/] },
  de: { ..._lang, code: "de", name: "Deutsch", nameEn: "German", whisperLanguage: "de", ttsVoiceIds: { male: "de-DE-ConradNeural", female: "de-DE-KatjaNeural" } },
  fr: { ..._lang, code: "fr", name: "Français", nameEn: "French", whisperLanguage: "fr", ttsVoiceIds: { male: "fr-FR-HenriNeural", female: "fr-FR-DeniseNeural" } },
  es: { ..._lang, code: "es", name: "Español", nameEn: "Spanish", whisperLanguage: "es", ttsVoiceIds: { male: "es-ES-AlvaroNeural", female: "es-ES-ElviraNeural" } },
  pt: { ..._lang, code: "pt", name: "Português", nameEn: "Portuguese", whisperLanguage: "pt", ttsVoiceIds: { male: "pt-BR-AntonioNeural", female: "pt-BR-FranciscaNeural" } },
  ja: { ..._lang, code: "ja", name: "日本語", nameEn: "Japanese", whisperLanguage: "ja", ttsVoiceIds: { male: "ja-JP-KeitaNeural", female: "ja-JP-NanamiNeural" } },
  ko: { ..._lang, code: "ko", name: "한국어", nameEn: "Korean", whisperLanguage: "ko", ttsVoiceIds: { male: "ko-KR-InJoonNeural", female: "ko-KR-SunHiNeural" } },
  zh: { ..._lang, code: "zh", name: "中文", nameEn: "Chinese", whisperLanguage: "zh", ttsVoiceIds: { male: "zh-CN-YunxiNeural", female: "zh-CN-XiaoxiaoNeural" } },
};

// --- Agent System ---

export type AgentRole = "anchor" | "analyst" | "correspondent" | "expert" | "host";

export type AgentPersonalityTone =
  | "professional"
  | "enthusiastic"
  | "sarcastic"
  | "calm"
  | "dramatic"
  | "humorous";

export interface AgentPersonality {
  tone: AgentPersonalityTone;
  expertise: string[];
  catchphrases: Partial<Record<LanguageCode, string[]>>;
  description: Partial<Record<LanguageCode, string>>;
}

export interface AgentVoiceConfig {
  provider: "azure-speech";
  voices: Partial<Record<LanguageCode, {
    male: string;
    female: string;
  }>>;
}

export interface AgentCharacter {
  rivFile: string;
  color: string;
  position: { x: number; y: number };
  scale: number;
  states: {
    idle: string;
    talking: string;
    walking: string;
    excited: string;
    thinking: string;
    pointing: string;
  };
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  languages: LanguageCode[];
  personality: AgentPersonality;
  character: AgentCharacter;
  voice: AgentVoiceConfig;
}

// --- Stream Ingestion ---

export type StreamPlatform = "twitch" | "kick" | "youtube" | "vkplay" | "custom";

export interface StreamConfig {
  id: string;
  name: string;
  platform: StreamPlatform;
  url: string;
  channel: string;
  quality: "best" | "1080p" | "720p" | "480p";
  language: LanguageCode;
  captureAudio: boolean;
  captureChat: boolean;
  frameSampleRate: number; // seconds between frame captures
}

export interface StreamState {
  streamId: string;
  isLive: boolean;
  startedAt: Date | null;
  viewerCount: number;
  title: string;
  gameCategory: string;
  language: LanguageCode;
}

// --- Analysis Pipeline ---

export interface VideoFrame {
  streamId: string;
  timestamp: number;
  imageBase64: string;
  width: number;
  height: number;
}

export interface FrameAnalysis {
  streamId: string;
  timestamp: number;
  description: string;
  onScreenText: string;
  detectedEmotion: string;
  detectedActivity: string;
  interestingnessScore: number; // 0-1
  tags: string[];
}

export interface AudioSegment {
  streamId: string;
  startTime: number;
  endTime: number;
  transcript: string;
  language: LanguageCode;
  confidence: number;
  speaker?: string;
}

export interface ChatMessage {
  streamId: string;
  platform: StreamPlatform;
  username: string;
  message: string;
  timestamp: Date;
  badges: string[];
  emotes: string[];
}

export interface ChatSummary {
  streamId: string;
  windowStart: Date;
  windowEnd: Date;
  messageCount: number;
  uniqueUsers: number;
  topKeywords: string[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  hypeLevel: number; // 0-1
  notableMessages: ChatMessage[];
}

export interface StreamContext {
  streamId: string;
  timestamp: number;
  frameAnalysis: FrameAnalysis | null;
  recentAudio: AudioSegment[];
  chatSummary: ChatSummary;
  recentEvents: InterestingEvent[];
}

export interface InterestingEvent {
  id: string;
  streamId: string;
  timestamp: number;
  type: "highlight" | "clip" | "reaction" | "breaking" | "discussion" | "funny";
  severity: number; // 0-1
  description: string;
  context: string;
  suggestedReaction: string;
}

// --- Decision Engine ---

export type DecisionAction =
  | "comment"
  | "breaking_news"
  | "discuss"
  | "react"
  | "wait"
  | "switch_scene"
  | "play_replay";

export interface Decision {
  action: DecisionAction;
  confidence: number;
  reason: string;
  targetAgentId?: string;
  priority: number; // 1-10
  context?: string;
}

// --- Commentary System ---

export interface CommentarySegment {
  id: string;
  agentId: string;
  text: string;
  language: LanguageCode;
  emotion: string;
  action: "speak" | "point" | "gesture" | "react";
  timestamp: number;
  duration: number; // estimated ms
  ttsAudioUrl?: string;
}

export interface DialogueExchange {
  id: string;
  segments: CommentarySegment[];
  topic: string;
  trigger: InterestingEvent;
  totalDuration: number;
}

// --- Anchor Scripts (from prompt agents) ---

export interface AnchorLine {
  text: string;
  emotion: "professional" | "excited" | "serious" | "humorous" | "enthusiastic" | "analytical" | "thoughtful";
}

export interface AnchorScript {
  type: "commentary" | "segment" | "news" | "snapshot" | "analysis" | "sentiment" | "visual" | "health";
  alex?: AnchorLine;
  sasha?: AnchorLine;
  ticker?: string;
  scene?: {
    type: "live" | "breaking" | "analysis" | "transition";
    title?: string;
  };
  // Agent-specific fields
  streamer?: string;
  platform?: string;
  is_live?: boolean;
  viewer_count?: number;
  game?: string;
  stream_title?: string;
  chat_sentiment?: string;
  sentiment_score?: number;
  trending_moment?: boolean;
  moment_description?: string;
  clip_worthy?: boolean;
  clip_reason?: string;
  recent_chat?: string[];
  alerts?: string[];
  // Show producer fields
  title?: string;
  show_type?: string;
  duration_seconds?: number;
  key_topics?: string[];
  // Meta-agent fields
  agent_health?: Record<string, string>;
  pipeline_performance?: Record<string, unknown>;
  improvement_suggestions?: string[];
  // Director fields
  agents_called?: string[];
  analysis_summary?: string;
  // Content analyzer fields
  game_detected?: string;
  game_confidence?: number;
  on_screen_text?: string[];
  scene_type?: string;
  scene_description?: string;
  production_quality?: string;
  key_visual_elements?: string[];
  content_highlights?: string[];
  quality_score?: number;
  // Chat pulse fields
  overall_sentiment?: string;
  toxicity_level?: string;
  trending_topics?: string[];
  hype_moments?: string[];
  active_users?: string[];
  emotional_dynamics?: string;
  message_count?: number;
  // Art director fields
  overlay?: { style: string; primary_color: string; secondary_color: string };
  transition?: string;
  mood?: string;
  visual_notes?: string;
}

// --- Studio Rendering ---

export type SceneType =
  | "idle"
  | "breaking_news"
  | "discussion"
  | "analysis"
  | "replay"
  | "commercial";

export interface StudioScene {
  type: SceneType;
  title: string;
  subtitle?: string;
  activeAgents: string[];
  background: string;
  overlays: StudioOverlay[];
}

export interface StudioOverlay {
  type: "ticker" | "banner" | "sidebar" | "picture_in_picture" | "scoreboard";
  visible: boolean;
  content: string;
  position: { x: number; y: number };
  animation?: string;
}

export interface StudioState {
  scene: StudioScene;
  activeAgents: AgentState[];
  ticker: string;
  banner: string | null;
  chatVisible: boolean;
}

export interface AgentState {
  agentId: string;
  position: { x: number; y: number };
  animationState: string; // maps to Rive state machine input
  isSpeaking: boolean;
  currentText: string;
  emotion: string;
}

// --- WebSocket Events (Backend → Studio) ---

export type StudioEventType =
  | "scene_change"
  | "agent_speak"
  | "agent_move"
  | "agent_emotion"
  | "ticker_update"
  | "banner_show"
  | "banner_hide"
  | "chat_highlight"
  | "audio_level"
  | "state_sync";

export interface StudioEvent {
  type: StudioEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface AgentSpeakEvent extends StudioEvent {
  type: "agent_speak";
  data: {
    agentId: string;
    text: string;
    language: LanguageCode;
    emotion: string;
    ttsAudioUrl: string;
    duration: number;
  };
}

export interface AgentMoveEvent extends StudioEvent {
  type: "agent_move";
  data: {
    agentId: string;
    position: { x: number; y: number };
    animation: string;
  };
}

export interface SceneChangeEvent extends StudioEvent {
  type: "scene_change";
  data: {
    scene: StudioScene;
  };
}

export interface TickerUpdateEvent extends StudioEvent {
  type: "ticker_update";
  data: {
    text: string;
    language: LanguageCode;
  };
}

// --- Azure AI Foundry ---

export type FoundryModelProvider = "openai" | "meta" | "mistral" | "cohere" | "google" | "anthropic";

export interface FoundryModelConfig {
  provider: FoundryModelProvider;
  modelId: string;
  deploymentName: string;
  apiVersion: string;
  maxTokens: number;
}

export interface FoundryConfig {
  endpoint: string;
  projectId: string;
  apiVersion: string;
  models: {
    vision: FoundryModelConfig;
    reasoning: FoundryModelConfig;
    fastReasoning: FoundryModelConfig;
    transcription: FoundryModelConfig;
    contentSafety: FoundryModelConfig;
  };
}

// --- Configuration ---

export interface MOMTVConfig {
  auth: {
    tenantId: string;
    clientId: string;
    clientSecret?: string;
  };
  foundry: FoundryConfig;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  streams: StreamConfig[];
  agents: Agent[];
  studio: {
    width: number;
    height: number;
    backgroundColor: string;
    fps: number;
  };
  tts: {
    provider: "azure-speech";
    subscriptionKey: string;
    region: string;
  };
}