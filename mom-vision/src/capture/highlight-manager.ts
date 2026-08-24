// ============================================================
// mom-vision — Highlight Manager
// ============================================================
// Detects and stores highlights from OCR and audio events
// ============================================================

import type { OcrCapture, AudioTranscript, StreamHighlight } from './types.js';
import { StorageClient } from './storage-client.js';

export class HighlightManager {
  private storage: StorageClient;
  private lastHighlightTime = 0;
  private readonly HIGHLIGHT_COOLDOWN_MS = 60_000; // 1 minute cooldown

  constructor(storage: StorageClient) {
    this.storage = storage;
  }

  /**
   * Check if OCR or audio data represents a highlight
   */
  async checkForHighlight(
    ocr: OcrCapture | null,
    transcript: AudioTranscript | null
  ): Promise<StreamHighlight | null> {
    const now = Date.now();

    // Cooldown check
    if (now - this.lastHighlightTime < this.HIGHLIGHT_COOLDOWN_MS) {
      return null;
    }

    // Auto-detect OCR highlights
    if (ocr && this.isOcrHighlight(ocr)) {
      return this.createHighlight(
        'ocr_event',
        ocr,
        null,
        'Notable text detected'
      );
    }

    // Auto-detect audio highlights
    if (transcript && this.isAudioHighlight(transcript)) {
      return this.createHighlight(
        'audio_event',
        null,
        transcript,
        'Audio event detected'
      );
    }

    return null;
  }

  /**
   * Check if OCR data contains highlight-worthy text
   */
  private isOcrHighlight(ocr: OcrCapture): boolean {
    const keywords = [
      'победа',
      'поражение',
      'victory',
      'defeat',
      'highlight',
      'play',
      'момент',
      'рекорд',
      'record',
    ];
    return ocr.text.some((t) =>
      keywords.some((k) => t.toLowerCase().includes(k))
    );
  }

  /**
   * Check if transcript contains highlight-worthy content
   */
  private isAudioHighlight(transcript: AudioTranscript): boolean {
    const keywords = [
      'восхитительно',
      'amazing',
      'incredible',
      'brilliant',
      'невероятно',
      'потрясающе',
    ];
    return keywords.some((k) =>
      transcript.transcript.toLowerCase().includes(k)
    );
  }

  /**
   * Create and store a highlight
   */
  private async createHighlight(
    type: StreamHighlight['type'],
    ocr: OcrCapture | null,
    transcript: AudioTranscript | null,
    reason: string
  ): Promise<StreamHighlight> {
    this.lastHighlightTime = Date.now();

    const highlight: StreamHighlight = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      channel: ocr?.channel || transcript?.channel || '',
      type,
      frameUrl: '',
      ocrData: ocr || undefined,
      transcriptData: transcript || undefined,
      reason,
      taggedBy: 'auto',
    };

    await this.storage.storeHighlight(highlight);
    return highlight;
  }
}
