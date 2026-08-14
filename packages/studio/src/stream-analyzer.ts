// ============================================================
// MOM TV — Stream Visual Analyzer
// ============================================================
// Analyzes the Twitch stream using GPT-4o vision via Foundry.
// Fetches the stream's live preview thumbnail and sends it
// to the AI for visual analysis.
// ============================================================

import { fetchLatestSegment } from "./twitch-hls.js";

// Use the Azure Function proxy to avoid CORS issues
const AGENT_ENDPOINT = "/api/agents/content-analyzer?api-version=v1";
const VISION_ENDPOINT = "/api/vision/analyze";

const TWITCH_CHANNEL = "KNIG04Ei";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    // Force JPEG MIME type — the proxy response may not have correct Content-Type
    const jpegBlob = new Blob([blob], { type: "image/jpeg" });
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(jpegBlob);
  });
}

export interface StreamAnalysis {
  timestamp: number;
  channel: string;
  game_detected: string;
  scene_description: string;
  mood: string;
  on_screen_text: string;
  production_quality: string;
  visual_topics: string[];
  is_live: boolean;
  segment_url?: string;
}

type AnalysisHandler = (analysis: StreamAnalysis) => void;

export class StreamAnalyzer {
  private timer: ReturnType<typeof setInterval> | null = null;
  private handlers: AnalysisHandler[] = [];
  private isAnalyzing = false;

  /**
   * Register a handler for new analysis results.
   */
  onAnalysis(handler: AnalysisHandler): void {
    this.handlers.push(handler);
  }

  private lastGptAnalysis = 0;
  private gptIntervalMs = 60_000; // GPT-4o analysis every 60s

  /**
   * Start periodic visual analysis.
   * Fast vision analysis runs frequently; GPT-4o runs less often.
   */
  start(intervalMs: number = 5_000): void {
    console.log(`[StreamAnalyzer] Starting fast analysis every ${intervalMs / 1000}s, GPT-4o every ${this.gptIntervalMs / 1000}s`);

    // Run immediately
    this.analyze();

    // Then on interval
    this.timer = setInterval(() => this.analyze(), intervalMs);
  }

  /**
   * Stop analysis.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Run a single analysis cycle.
   */
  async analyze(): Promise<StreamAnalysis | null> {
    if (this.isAnalyzing) {
      console.log("[StreamAnalyzer] Analysis already in progress, skipping");
      return null;
    }

    this.isAnalyzing = true;

    try {
      // 1. Fetch the Twitch stream preview thumbnail via proxy (bypasses CORS)
      const thumbnailRawUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${TWITCH_CHANNEL}-1920x1080.jpg?_t=${Date.now()}`;
      const proxyUrl = `/api/twitch/fetch?url=${encodeURIComponent(thumbnailRawUrl)}`;
      const thumbResp = await fetch(proxyUrl);
      if (!thumbResp.ok) {
        throw new Error(`Thumbnail proxy returned ${thumbResp.status}`);
      }
      const thumbData = (await thumbResp.json()) as { base64?: string; contentType?: string; error?: string };
      if (!thumbData.base64 || !thumbData.contentType) {
        throw new Error(`Thumbnail proxy error: ${thumbData.error || "missing base64/contentType"}`);
      }
      const thumbnailBase64 = `data:${thumbData.contentType};base64,${thumbData.base64}`;

      // 2. Fast vision analysis (Computer Vision / Content Understanding)
      // Use the raw URL through the proxy to avoid large base64 payloads
      const visionResult = await this.callFastVisionUrl(thumbnailRawUrl);

      // 3. Also try to get an HLS segment URL for reference
      const segment = await fetchLatestSegment(TWITCH_CHANNEL);

      // 4. GPT-4o deep analysis (less frequent)
      let gptAnalysis = "";
      const now = Date.now();
      if (now - this.lastGptAnalysis >= this.gptIntervalMs) {
        this.lastGptAnalysis = now;
        gptAnalysis = await this.callVisionAgent(thumbnailBase64, segment?.url);
      }

      // 5. Parse the response (prefer GPT if available, otherwise use fast vision)
      const analysisText = gptAnalysis || this.visionToAnalysisText(visionResult);
      const analysis = this.parseAnalysis(analysisText, !!segment);

      // Enrich with fast vision data
      if (analysis && visionResult) {
        if (visionResult.caption && analysis.scene_description === "No description") {
          analysis.scene_description = visionResult.caption;
        }
        if (visionResult.tags?.length > 0) {
          analysis.visual_topics = visionResult.tags.map((t: { name: string }) => t.name).slice(0, 5);
        }
        if (visionResult.text?.length > 0) {
          analysis.on_screen_text = visionResult.text.join(" | ");
        }
      }

      if (analysis) {
        // Notify handlers
        for (const handler of this.handlers) {
          try {
            handler(analysis);
          } catch (err) {
            console.error("[StreamAnalyzer] Handler error:", err);
          }
        }
      }

      return analysis;
    } catch (err) {
      console.error("[StreamAnalyzer] Analysis failed:", err);
      return null;
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Call fast vision analysis using image URL (avoids large base64 payloads).
   */
  private async callFastVisionUrl(imageUrl: string): Promise<{
    caption: string;
    tags: Array<{ name: string; confidence: number }>;
    objects: Array<{ name: string; confidence: number }>;
    text: string[];
  } | null> {
    try {
      const response = await fetch(VISION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        console.warn(`[StreamAnalyzer] Fast vision returned ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (err) {
      console.warn("[StreamAnalyzer] Fast vision failed:", err);
      return null;
    }
  }

  /**
   * Call fast vision analysis (Computer Vision / Content Understanding).
   * Returns structured results in ~200-500ms.
   */
  private async callFastVision(thumbnailBase64: string): Promise<{
    caption: string;
    tags: Array<{ name: string; confidence: number }>;
    objects: Array<{ name: string; confidence: number }>;
    text: string[];
  } | null> {
    try {
      const response = await fetch(VISION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: thumbnailBase64 }),
      });

      if (!response.ok) {
        console.warn(`[StreamAnalyzer] Fast vision returned ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (err) {
      console.warn("[StreamAnalyzer] Fast vision failed:", err);
      return null;
    }
  }

  /**
   * Convert fast vision results to a text format for parsing.
   */
  private visionToAnalysisText(result: {
    caption: string;
    tags: Array<{ name: string; confidence: number }>;
    objects: Array<{ name: string; confidence: number }>;
    text: string[];
  } | null): string {
    if (!result) return "";

    return JSON.stringify({
      game_detected: result.tags?.find(t =>
        ["game", "gaming", "esports", "streaming"].some(k => t.name.toLowerCase().includes(k))
      )?.name || "Unknown",
      scene_description: result.caption || "No description",
      mood: "neutral",
      on_screen_text: result.text?.join(", ") || "",
      production_quality: "unknown",
      visual_topics: result.tags?.map(t => t.name).slice(0, 5) || [],
    });
  }

  /**
   * Call the Foundry content-analyzer agent with an image.
   * Uses the Responses API with image_url input.
   */
  private async callVisionAgent(
    thumbnailBase64: string,
    segmentUrl?: string,
  ): Promise<string> {
    const endpoint = AGENT_ENDPOINT;

    const prompt = `Analyze this Twitch stream screenshot for channel "${TWITCH_CHANNEL}".

Return a JSON object with exactly these fields:
{
  "game_detected": "name of the game or content being streamed",
  "scene_description": "brief description of what's happening on screen",
  "mood": "overall mood/atmosphere (exciting, calm, intense, funny, etc.)",
  "on_screen_text": "any visible text overlays, alerts, or graphics",
  "production_quality": "quality assessment (professional, amateur, standard)",
  "visual_topics": ["list", "of", "visual", "topics", "detected"]
}

Return ONLY the JSON object, no other text.`;

    // Build input with image
    const input = [
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: prompt,
          },
          {
            type: "input_image",
            image_url: thumbnailBase64,
          },
        ],
      },
    ];

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vision agent call failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      output?: Array<{
        type: string;
        content?: Array<{ type: string; text?: string }>;
      }>;
    };

    // Extract text from response
    let text = "";
    for (const item of data.output || []) {
      if (item.type === "message" && item.content) {
        for (const content of item.content) {
          if (content.type === "output_text" && content.text) {
            text += content.text;
          }
        }
      }
    }

    return text;
  }

  /**
   * Parse the agent's response into a StreamAnalysis.
   */
  private parseAnalysis(responseText: string, isLive: boolean): StreamAnalysis | null {
    try {
      // Try to extract JSON from the response
      let jsonStr = responseText.trim();

      // Handle markdown code blocks
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // Try to find JSON object
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) {
        jsonStr = objMatch[0];
      }

      const parsed = JSON.parse(jsonStr) as {
        game_detected?: string;
        scene_description?: string;
        mood?: string;
        on_screen_text?: string;
        production_quality?: string;
        visual_topics?: string[];
      };

      return {
        timestamp: Date.now(),
        channel: TWITCH_CHANNEL,
        game_detected: parsed.game_detected || "Unknown",
        scene_description: parsed.scene_description || "No description",
        mood: parsed.mood || "neutral",
        on_screen_text: parsed.on_screen_text || "",
        production_quality: parsed.production_quality || "standard",
        visual_topics: parsed.visual_topics || [],
        is_live: isLive,
      };
    } catch {
      console.warn("[StreamAnalyzer] Could not parse analysis JSON, using raw text");
      return {
        timestamp: Date.now(),
        channel: TWITCH_CHANNEL,
        game_detected: "Unknown",
        scene_description: responseText.slice(0, 200),
        mood: "neutral",
        on_screen_text: "",
        production_quality: "standard",
        visual_topics: [],
        is_live: isLive,
      };
    }
  }
}