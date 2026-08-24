// ============================================================
// mom-vision — Stream Status
// ============================================================
// Tracks current channel and live status via Cosmos DB
// ============================================================

import type { StreamStatus as StreamStatusType } from './types.js';

const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT!;
const COSMOS_KEY = process.env.COSMOS_KEY!;

export class StatusTracker {
  constructor() {}

  /**
   * Log stream status
   */
  async updateStatus(status: StreamStatusType): Promise<void> {
    console.log(`[Status] ${status.channel}: ${status.isLive ? 'LIVE' : 'OFFLINE'}`);
    console.log(`[Status] Viewers: ${status.viewerCount}`);
    console.log(`[Status] Language: ${status.currentLanguage}`);
  }

  /**
   * Get current channel from env
   */
  async getCurrentChannel(): Promise<string | null> {
    return process.env.CURRENT_CHANNEL || null;
  }

  /**
   * Set current channel
   */
  async setCurrentChannel(channel: string): Promise<void> {
    console.log(`[Status] Channel set to: ${channel}`);
  }
}
