// ============================================================
// mom-vision — Data Types
// ============================================================

export interface OcrCapture {
  id: string;
  timestamp: number;
  channel: string;
  text: string[];
  regions: TextRegion[];
  language: 'ru' | 'en' | 'mixed';
}

export interface TextRegion {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface AudioTranscript {
  id: string;
  timestamp: number;
  channel: string;
  transcript: string;
  language: 'ru' | 'en' | 'mixed';
  segments: TranscriptSegment[];
  durationSeconds: number;
  hasClosedCaptions: boolean;
}

export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
  confidence: number;
}

export interface StreamHighlight {
  id: string;
  timestamp: number;
  channel: string;
  type: 'ocr_event' | 'audio_event' | 'manual';
  frameUrl: string;
  audioUrl?: string;
  ocrData?: OcrCapture;
  transcriptData?: AudioTranscript;
  reason: string;
  taggedBy: 'auto' | 'user';
}

export interface StreamStatus {
  channel: string;
  isLive: boolean;
  viewerCount: number;
  lastOcrCapture: Date;
  lastAudioCapture: Date;
  currentLanguage: 'ru' | 'en' | 'mixed';
}

export interface CaptureConfig {
  ocrIntervalMs: number;
  audioChunkSeconds: number;
  storageRetentionDays: number;
  currentChannel: string;
}

export interface StreamState {
  id: "current";
  channel: string;
  isLive: boolean;
  vodId: string | null;
  vodTitle: string | null;
  updatedAt: string;
}
