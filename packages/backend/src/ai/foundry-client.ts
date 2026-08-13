// ============================================================
// MOMTV Backend - Azure AI Foundry Client
// ============================================================
// Unified wrapper for accessing AI models through Azure AI Foundry.
// Supports any model provider deployed to the Foundry project.
// ============================================================

import { DefaultAzureCredential } from "@azure/identity";
import type {
  FoundryConfig,
  FoundryModelConfig,
  FrameAnalysis,
  LanguageCode,
} from "@momtv/shared";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface ChatResponse {
  content: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export class FoundryClient {
  private credential: DefaultAzureCredential;
  private config: FoundryConfig;

  constructor(config: FoundryConfig) {
    this.config = config;
    this.credential = new DefaultAzureCredential();
  }

  // --- Low-level chat completion ---

  async chat(
    modelConfig: FoundryModelConfig,
    messages: ChatMessage[],
    options: { temperature?: number; maxTokens?: number } = {},
  ): Promise<ChatResponse> {
    const token = await this.credential.getToken("https://cognitiveservices.azure.com/.default");

    const url = `${this.config.endpoint}/openai/deployments/${modelConfig.deploymentName}/chat/completions?api-version=${modelConfig.apiVersion}`;

    const body = {
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? modelConfig.maxTokens,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Foundry API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return {
      content: data.choices[0]?.message.content ?? "",
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  // --- Vision Analysis ---

  async analyzeFrame(
    imageBase64: string,
    context: string,
    language: LanguageCode,
  ): Promise<FrameAnalysis> {
    const langInstruction = language === "ru"
      ? "Respond in Russian. Describe what you see and identify on-screen text."
      : "Describe what you see and identify on-screen text.";

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a frame analyzer for a live TV studio. Analyze the video frame and provide a structured analysis. ${langInstruction}

Respond with valid JSON:
{
  "description": "what's happening in the frame",
  "onScreenText": "any text visible on screen",
  "detectedEmotion": "dominant emotion (happy/sad/excited/neutral/tense)",
  "detectedActivity": "what activity is happening",
  "interestingnessScore": 0.0-1.0,
  "tags": ["relevant", "tags"]
}`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Context: ${context}\n\nAnalyze this video frame:` },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      },
    ];

    const response = await this.chat(this.config.models.vision, messages, {
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(response.content) as Omit<FrameAnalysis, "streamId" | "timestamp">;
      return {
        streamId: "",
        timestamp: Date.now(),
        ...parsed,
      };
    } catch {
      // Fallback if JSON parsing fails
      return {
        streamId: "",
        timestamp: Date.now(),
        description: response.content,
        onScreenText: "",
        detectedEmotion: "neutral",
        detectedActivity: "unknown",
        interestingnessScore: 0.3,
        tags: [],
      };
    }
  }

  // --- Reasoning (Decision Engine) ---

  async decide(contextSummary: string, language: LanguageCode): Promise<{
    action: string;
    confidence: number;
    reason: string;
    targetAgentId?: string;
    priority: number;
  }> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are the decision engine for MOMTV, an AI-powered cartoon TV studio. 
You watch a live stream and decide when the AI anchors should react or comment.

Analyze the context and decide the next action. Consider:
- Is something exciting/interesting happening?
- Is there a moment worth commenting on?
- Should we wait and observe more?
- Which agent should react?

Respond with valid JSON:
{
  "action": "comment|breaking_news|discuss|react|wait",
  "confidence": 0.0-1.0,
  "reason": "why you chose this action",
  "targetAgentId": "alex or sasha",
  "priority": 1-10
}

Be selective - only trigger commentary for genuinely interesting moments (score > 0.6).`,
      },
      {
        role: "user",
        content: `Current stream context:\n${contextSummary}`,
      },
    ];

    const response = await this.chat(this.config.models.fastReasoning, messages, {
      temperature: 0.4,
    });

    try {
      return JSON.parse(response.content) as {
        action: string;
        confidence: number;
        reason: string;
        targetAgentId?: string;
        priority: number;
      };
    } catch {
      return {
        action: "wait",
        confidence: 0.5,
        reason: "Unable to parse decision, defaulting to wait",
        priority: 1,
      };
    }
  }

  // --- Commentary Generation ---

  async generateCommentary(
    agentId: string,
    agentName: string,
    agentRole: string,
    agentTone: string,
    context: string,
    trigger: string,
    language: LanguageCode,
  ): Promise<{ text: string; emotion: string; action: string }> {
    const langInstruction = language === "ru"
      ? "Генерируй комментарий на русском языке."
      : "Generate commentary in English.";

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are ${agentName}, a ${agentRole} on MOMTV AI TV Studio.
Your tone is ${agentTone}. You speak naturally like a real TV personality.

${langInstruction}

Rules:
- Keep commentary concise (1-3 sentences)
- Be engaging and natural
- Reference what's happening on stream
- Use your personality and catchphrases when appropriate
- React genuinely to exciting moments
- For Russian, use natural conversational Russian

Respond with valid JSON:
{
  "text": "your commentary text",
  "emotion": "happy|excited|surprised|concerned|amused|neutral",
  "action": "speak|point|gesture|react"
}`,
      },
      {
        role: "user",
        content: `Trigger: ${trigger}\n\nStream context:\n${context}`,
      },
    ];

    const response = await this.chat(this.config.models.reasoning, messages, {
      temperature: 0.8,
    });

    try {
      return JSON.parse(response.content) as { text: string; emotion: string; action: string };
    } catch {
      return {
        text: response.content.slice(0, 200),
        emotion: "neutral",
        action: "speak",
      };
    }
  }

  // --- Chat Summary / Analysis ---

  async analyzeChat(messages: string[], language: LanguageCode): Promise<{
    topKeywords: string[];
    sentiment: "positive" | "negative" | "neutral" | "mixed";
    hypeLevel: number;
    notableMessages: string[];
  }> {
    const langNote = language === "ru"
      ? "Analyze the Russian chat messages. Keywords can be in Russian."
      : "Analyze the English chat messages.";

    const chatText = messages.slice(-50).join("\n");

    const response = await this.chat(
      this.config.models.fastReasoning,
      [
        {
          role: "system",
          content: `You are a chat analyzer for MOMTV. ${langNote}
Analyze Twitch/chat messages and extract insights.

Respond with valid JSON:
{
  "topKeywords": ["word1", "word2", ...],
  "sentiment": "positive|negative|neutral|mixed",
  "hypeLevel": 0.0-1.0,
  "notableMessages": ["message1", "message2"]
}`,
        },
        {
          role: "user",
          content: `Recent chat messages:\n${chatText}`,
        },
      ],
      { temperature: 0.3 },
    );

    try {
      return JSON.parse(response.content) as {
        topKeywords: string[];
        sentiment: "positive" | "negative" | "neutral" | "mixed";
        hypeLevel: number;
        notableMessages: string[];
      };
    } catch {
      return {
        topKeywords: [],
        sentiment: "neutral",
        hypeLevel: 0,
        notableMessages: [],
      };
    }
  }
}