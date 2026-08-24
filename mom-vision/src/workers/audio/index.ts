// ============================================================
// mom-vision — Audio Worker Entry Point
// ============================================================

import { AudioWorker } from '../../capture/audio-worker.js';
import { StorageClient } from '../../capture/storage-client.js';
import { StatusTracker } from '../../capture/stream-status.js';

const channel = process.env.CURRENT_CHANNEL || 'KNIG04Ei';

console.log(`[Audio Worker] Starting for channel: ${channel}`);

const audioWorker = new AudioWorker();
const storage = new StorageClient();

// Continuous audio capture loop
async function startAudioCapture() {
  console.log('[Audio Worker] Audio capture started');

  while (true) {
    try {
      // TODO: Implement actual audio recording from stream
      // This would use FFmpeg to capture audio from the HLS stream
      await new Promise((r) => setTimeout(r, 30_000)); // 30 second chunks
    } catch (error) {
      console.error('[Audio Worker] Error:', error);
    }
  }
}

startAudioCapture();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Audio Worker] Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Audio Worker] Interrupted...');
  process.exit(0);
});
