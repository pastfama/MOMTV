// ============================================================
// MOMTV Backend - Configuration
// ============================================================

import dotenv from "dotenv";
import type { MOMTVConfig } from "@momtv/shared";

dotenv.config();

function env(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadConfig(): MOMTVConfig {
  return {
    auth: {
      tenantId: env("AZURE_TENANT_ID"),
      clientId: env("AZURE_CLIENT_ID"),
      clientSecret: process.env["AZURE_CLIENT_SECRET"],
    },
    foundry: {
      endpoint: env("AZURE_AI_ENDPOINT"),
      projectId: env("AZURE_AI_PROJECT_ID"),
      apiVersion: env("AZURE_AI_API_VERSION", "2024-12-01-preview"),
      models: {
        vision: {
          provider: "openai",
          modelId: env("MODEL_VISION", "gpt-4o"),
          deploymentName: env("MODEL_VISION_DEPLOYMENT", "gpt-4o"),
          apiVersion: "2024-12-01-preview",
          maxTokens: 1024,
        },
        reasoning: {
          provider: "openai",
          modelId: env("MODEL_REASONING", "gpt-4o"),
          deploymentName: env("MODEL_REASONING_DEPLOYMENT", "gpt-4o"),
          apiVersion: "2024-12-01-preview",
          maxTokens: 4096,
        },
        fastReasoning: {
          provider: "openai",
          modelId: env("MODEL_FAST_REASONING", "gpt-4o-mini"),
          deploymentName: env("MODEL_FAST_DEPLOYMENT", "gpt-4o-mini"),
          apiVersion: "2024-12-01-preview",
          maxTokens: 1024,
        },
        transcription: {
          provider: "openai",
          modelId: env("MODEL_TRANSCRIPTION", "whisper-large"),
          deploymentName: env("MODEL_TRANSCRIPTION_DEPLOYMENT", "whisper-large"),
          apiVersion: "2024-12-01-preview",
          maxTokens: 0,
        },
        contentSafety: {
          provider: "openai",
          modelId: "azure-content-safety",
          deploymentName: "azure-content-safety",
          apiVersion: "2024-12-01-preview",
          maxTokens: 0,
        },
      },
    },
    redis: {
      host: env("REDIS_HOST", "localhost"),
      port: parseInt(env("REDIS_PORT", "6379"), 10),
      password: process.env["REDIS_PASSWORD"],
    },
    streams: loadStreamConfigs(),
    agents: getDefaultAgents(),
    studio: {
      width: 1920,
      height: 1080,
      backgroundColor: "#1a1a2e",
      fps: 30,
    },
    tts: {
      provider: "azure-speech",
      subscriptionKey: env("AZURE_SPEECH_KEY"),
      region: env("AZURE_SPEECH_REGION", "eastus"),
    },
  };
}

function loadStreamConfigs(): MOMTVConfig["streams"] {
  // Support WATCHED_CHANNELS env var: "twitch:shroud,twitch:xqc,kick:channelname"
  const channelsEnv = process.env["WATCHED_CHANNELS"];
  if (channelsEnv) {
    return channelsEnv.split(",").map((entry, i) => {
      const [platform, channel, lang] = entry.trim().split(":");
      return {
        id: `stream-${i}`,
        name: `${channel} (${platform})`,
        platform: (platform ?? "twitch") as "twitch" | "kick" | "youtube" | "vkplay",
        url: "",
        channel: channel ?? "",
        quality: "720p" as const,
        language: (lang ?? "en") as "en" | "ru",
        captureAudio: true,
        captureChat: true,
        frameSampleRate: 5,
      };
    });
  }

  // Fallback: single channel from STREAM_CHANNEL env var
  const channel = process.env["STREAM_CHANNEL"];
  if (channel) {
    return [
      {
        id: "stream-0",
        name: `${channel} (twitch)`,
        platform: "twitch" as const,
        url: "",
        channel,
        quality: "720p" as const,
        language: "en" as const,
        captureAudio: true,
        captureChat: true,
        frameSampleRate: 5,
      },
    ];
  }

  // No channels configured
  console.warn("[Config] No WATCHED_CHANNELS or STREAM_CHANNEL set. No streams will be monitored.");
  return [];
}

function getDefaultAgents(): MOMTVConfig["agents"] {
  return [
    {
      id: "alex",
      name: "Alex",
      role: "anchor",
      languages: ["en", "ru"],
      personality: {
        tone: "professional",
        expertise: ["gaming", "esports", "streaming", "tech"],
        catchphrases: {
          en: ["Breaking news!", "Let me break down the stream...", "Welcome to MOMTV!"],
          ru: ["Срочные новости!", "Давайте разберём стрим...", "Добро пожаловать в MOMTV!"],
        },
        description: {
          en: "Professional anchor who leads the broadcast with confident commentary.",
          ru: "Профессиональный ведущий, который руководит эфиром уверенным комментарием.",
        },
      },
      character: {
        rivFile: "characters/alex-anchor.riv",
        color: "#3b82f6",
        position: { x: 0.35, y: 0.55 },
        scale: 1.0,
        states: {
          idle: "Idle",
          talking: "Talking",
          walking: "Walking",
          excited: "Excited",
          thinking: "Thinking",
          pointing: "Pointing",
        },
      },
      voice: {
        provider: "azure-speech",
        voices: {
          en: { male: "en-US-GuyNeural", female: "en-US-JennyNeural" },
          ru: { male: "ru-RU-DmitryNeural", female: "ru-RU-SvetlanaNeural" },
        },
      },
    },
    {
      id: "sasha",
      name: "Sasha",
      role: "analyst",
      languages: ["en", "ru"],
      personality: {
        tone: "enthusiastic",
        expertise: ["data-analysis", "viewer-engagement", "chat-dynamics"],
        catchphrases: {
          en: ["The data tells us...", "Interesting pattern here!", "Look at these numbers!"],
          ru: ["Данные говорят нам...", "Интересная закономерность!", "Посмотрите на эти цифры!"],
        },
        description: {
          en: "Enthusiastic analyst who dives deep into chat trends and viewer metrics.",
          ru: "Энтузиаст-аналитик, который глубоко погружается в тренды чата и метрики зрителей.",
        },
      },
      character: {
        rivFile: "characters/sasha-analyst.riv",
        color: "#ef4444",
        position: { x: 0.65, y: 0.55 },
        scale: 1.0,
        states: {
          idle: "Idle",
          talking: "Talking",
          walking: "Walking",
          excited: "Excited",
          thinking: "Thinking",
          pointing: "Pointing",
        },
      },
      voice: {
        provider: "azure-speech",
        voices: {
          en: { male: "en-US-GuyNeural", female: "en-US-JennyNeural" },
          ru: { male: "ru-RU-DmitryNeural", female: "ru-RU-SvetlanaNeural" },
        },
      },
    },
  ];
}