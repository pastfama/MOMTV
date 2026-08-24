import type { StreamState, NarratorDecision } from './types.js';

// Model Router - selects cheapest capable model for each task
class ModelRouter {
  selectModel(taskType: string): string {
    // Simple checks: use cheapest model
    if (taskType === 'check_status' || taskType === 'simple_check') {
      return 'gpt-4.1-nano';  // $0.10/1M tokens
    }
    // Medium decisions
    if (taskType === 'switch_channel' || taskType === 'medium') {
      return 'gpt-4.1-mini';  // $0.40/1M tokens
    }
    // Complex decisions
    if (taskType === 'complex' || taskType === 'creative') {
      return 'gpt-4.1';       // $2.00/1M tokens
    }
    return 'gpt-4.1-mini';    // default
  }
}

export class NarratorAgent {
  private llmEndpoint: string;
  private interval: number;
  private state: StreamState;
  private router: ModelRouter;
  public lastDecision: string = 'none';
  public lastDecisionTime: Date = new Date();

  constructor(config: { llmEndpoint: string; interval?: number }) {
    this.llmEndpoint = config.llmEndpoint;
    this.interval = config.interval || 30000;
    this.router = new ModelRouter();
    this.state = {
      id: 'current',
      channel: 'KNIG04Ei',
      isLive: true,
      vodId: null,
      vodTitle: null,
      updatedAt: new Date().toISOString()
    };
  }

  getStatus() {
    return {
      channel: this.state.channel,
      isLive: this.state.isLive,
      lastDecision: this.lastDecision,
      lastDecisionTime: this.lastDecisionTime.toISOString(),
      uptime: process.uptime()
    };
  }

  async runLoop(): Promise<void> {
    console.log('[Narrator] Starting...');
    while (true) {
      await this.sleep(this.interval);
      try {
        await this.tick();
      } catch (e) {
        console.error('[Narrator] Error:', e);
      }
    }
  }

  private async tick(): Promise<void> {
    const isLive = await this.checkStreamStatus(this.state.channel);
    const decision = await this.makeDecision(isLive);
    await this.executeDecision(decision);
  }

  private async makeDecision(isLive: boolean): Promise<NarratorDecision> {
    // Use router to select cheapest model for this task
    const model = this.router.selectModel('check_status');
    console.log('[Narrator] Using model:', model);

    if (!isLive) {
      return {
        action: 'SWITCH_CHANNEL',
        newState: { ...this.state, channel: 'next' },
        reason: 'Stream offline'
      };
    }
    return {
      action: 'WAIT',
      newState: this.state,
      reason: 'Stream live'
    };
  }

  private async executeDecision(decision: NarratorDecision): Promise<void> {
    this.lastDecision = decision.action;
    this.lastDecisionTime = new Date();
    console.log('[Narrator] Decision:', decision.action, decision.reason);
    this.state = decision.newState;
  }

  private async checkStreamStatus(channel: string): Promise<boolean> {
    try {
      const resp = await fetch('https://api.twitch.tv/helix/streams?user_login=' + channel, {
        headers: { 'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko' }
      });
      const data = await resp.json();
      return data.data && data.data.length > 0;
    } catch {
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
