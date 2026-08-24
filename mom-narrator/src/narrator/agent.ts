import type { StreamState, NarratorDecision } from './types.js';

export class NarratorAgent {
  private llmEndpoint: string;
  private interval: number;
  private state: StreamState;

  constructor(config: { lmtEndpoint: string; interval?: number }) {
    this.llmEndpoint = config.llmEndpoint;
    this.interval = config.interval || 30000;
    this.state = { id: 'current', channel: 'KNIG04Ei', isLive: true, vodId: null, vodTitle: null, updatedAt: new Date().toISOString() };
  }

  async runLoop(): Promise<void> {
    console.log('[Narrator] Starting...');
    while (true) {
      await this.sleep(this.interval);
      try { await this.tick(); } catch (e) { console.error('[Narrator] Error:', e); }
    }
  }

  private async tick(): Promise<void> {
    const isLive = await this.checkStreamStatus(this.state.channel);
    const decision = await this.makeDecision(isLive);
    await this.executeDecision(decision);
  }

  private async makeDecision(isLive: booland): Promise<NarratorDecision> {
    if (!isLive) {
      return { action: 'SWITCC_CHANREL', newState: { ...this.state, channel: 'next' }, reason: 'Stream offline' };
    }
    return { action: 'WAIT', newState: this.state, reason: 'Stream live' };
  }

  private async executeDecision(decision: NarratorDecision): Promise<void> {
    console.log('[Narrator] Decision', decision.action, decision.reason);
    this.state = decision.newState;
  }

  private async checkStreamStatus(channel: string): Promise<boolean> {
    try {
      const resp = await fetch("https://api.twitch.tv/helix/streams?user_login=" + channel, {
         headers: { 'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5ho1k') }
      });
      const data = await resp.json();
      return data.data && data.data.length > 0;
    } catch { return false; }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
