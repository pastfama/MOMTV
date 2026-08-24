// ============================================================
// mom-vision — Audio Worker
// ============================================================
// LLM Speech for continuous transcription (Russian + English)
// ============================================================

import type { AudioTranscript, TranscriptSegment } from './types.js';

const SPEECH_ENDPOINT = process.env.AZURE_SPEECH_ENDPOINT!;
const SPEECH_KEY = process.env.AZURE_SPEECH_KEY!;

export class AudioWorker {
  /**
   * Transcribe an audio chunk using LLM Speech
   */
  async transcribeChunk(
    audioBuffer: Buffer,
    channel: string,
    durationSeconds: number = 30
  ): Promise<AudioTranscript> {
    const response = await fetch(
      `${SPEECH_ENDPOINT}/speech/recognition/conversation/cognitiveservices/v1?language=ru-RU`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
          'Ocp-Apim-Subscription-Key': SPEECH_KEY,
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      throw new Error(`Speech API error: ${response.status}`);
    }

    const result: any = await response.json();

    // Parse segments from word-level data
    const segments: TranscriptSegment[] =
      result.NBest?.[0]?.Words?.map((w: any) => ({
        startMs: w.Offset / 10000,
        endMs: (w.Offset + w.Duration) / 10000,
        text: w.Word,
        confidence: w.Confidence || 0.8,
      })) || [];

    const transcript = result.DisplayText || '';

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      channel,
      transcript,
      language: this.detectLanguage(transcript),
      segments,
      durationSeconds,
      hasClosedCaptions: false,
    };
  }

  /**
   * Detect language from transcript text
   */
  private detectLanguage(text: string): 'ru' | 'en' | 'mixed' {
    const hasRussian = /[а-яА-Я]/.test(text);
    const hasEnglish = /[a-zA-Z]/.test(text);

    if (hasRussian && hasEnglish) return 'mixed';
    if (hasRussian) return 'ru';
    return 'en';
  }
}
