// ============================================================
// mom-vision — Public API
// ============================================================

export { CapturePipeline } from './capture-pipeline.js';
export { OcrWorker } from './ocr-worker.js';
export { AudioWorker } from './audio-worker.js';
export { StorageClient } from './storage-client.js';
export { HighlightManager } from './highlight-manager.js';
export { StatusTracker } from './stream-status.js';

export type {
  OcrCapture,
  TextRegion,
  AudioTranscript,
  TranscriptSegment,
  StreamHighlight,
  StreamStatus as StreamStatusType,
  CaptureConfig,
} from './types.js';
