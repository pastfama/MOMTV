// ============================================================
// MOMTV Backend - TTS (Azure AI Speech)
// ============================================================
// Text-to-speech synthesis using Azure AI Speech Service.
// Supports multiple voices and languages for different agents.
// ============================================================

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuid } from "uuid";
import type { Agent, LanguageCode } from "@momtv/shared";

const AUDIO_CACHE_DIR = join(process.cwd(), ".cache", "tts");

export interface TTSResult {
  audioPath: string;
  audioBase64: string;
  duration: number; // estimated ms
}

export class SpeechSynthesizer {
  private subscriptionKey: string;
  private region: string;

  constructor(subscriptionKey: string, region: string) {
    this.subscriptionKey = subscriptionKey;
    this.region = region;
  }

  async init(): Promise<void> {
    await mkdir(AUDIO_CACHE_DIR, { recursive: true });
  }

  async synthesize(
    text: string,
    agent: Agent,
    language: LanguageCode,
  ): Promise<TTSResult> {
    const voiceId = this.getVoiceId(agent, language);

    console.log(`[TTS] Synthesizing with voice ${voiceId}: "${text.slice(0, 50)}..."`);

    try {
      // Azure Speech SDK REST API
      const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
  <voice name="${voiceId}">
    ${this.escapeXml(text)}
  </voice>
</speak>`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.subscriptionKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
        },
        body: ssml,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS API error (${response.status}): ${errorText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const audioId = uuid();
      const audioPath = join(AUDIO_CACHE_DIR, `${audioId}.mp3`);

      await writeFile(audioPath, audioBuffer);

      // Estimate duration: ~128kbps = 16KB/s for 16khz audio
      const estimatedDuration = Math.max(1000, (audioBuffer.length / 16000) * 1000);

      return {
        audioPath,
        audioBase64: audioBuffer.toString("base64"),
        duration: estimatedDuration,
      };
    } catch (err) {
      console.error(`[TTS] Synthesis failed: ${err}`);
      // Return empty result rather than crashing
      return {
        audioPath: "",
        audioBase64: "",
        duration: Math.max(1000, text.length * 80), // rough estimate
      };
    }
  }

  private getVoiceId(agent: Agent, language: LanguageCode): string {
    const voices = agent.voice.voices[language];
    if (voices) {
      // Default to male voice for anchor, female for analyst
      return agent.role === "anchor" ? voices.male : voices.female;
    }
    // Fallback
    return language === "ru" ? "ru-RU-DmitryNeural" : "en-US-GuyNeural";
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """)
      .replace(/'/g, "'");
  }
}