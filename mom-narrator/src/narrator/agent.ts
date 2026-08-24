import crypto from 'crypto';
import type { StreamState, NarratorDecision } from './types.js';

// Cosmos DB Client
class CosmosClient {
  private endpoint: string;
  private key: string;
  private db = 'stream-capture';
  private container = 'stream-state';

  constructor(endpoint: string, key: string) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.key = key;
  }

  private auth(verb: string, rt: string, rid: string, date: string): string {
    const n = String.fromCharCode(10);
    const payload = verb.toLowerCase() + n + rt.toLowerCase() + n + rid + n + date.toLowerCase() + n + n;
    const key = Buffer.from(this.key, 'base64');
    const hmac = crypto.createHmac('sha256', key).update(payload).digest('base64');
    return encodeURIComponent('type=master' + '&' + 'ver=1.0' + '&' + 'sig=' + hmac);
  }

  async read(itemId: string): Promise<StreamState | null> {
    const date = new Date().toUTCString();
    const rid = 'dbs/' + this.db + '/colls/' + this.container + '/docs/' + itemId;
    const auth = this.auth('get', 'docs', rid, date);
    const url = this.endpoint + '/' + rid;
    const res = await fetch(url, {
      headers: {
        'x-ms-date': date,
        'x-ms-version': '2018-12-31',
        'x-ms-documentdb-partitionkey': '[\"current\"]',
        'Authorization': auth
      }
    });
    if (res.status === 200) return await res.json();
    return null;
  }

  async upsert(doc: any): Promise<void> {
    const date = new Date().toUTCString();
    const rid = 'dbs/' + this.db + '/colls/' + this.container;
    const auth = this.auth('post', 'docs', rid, date);
    const url = this.endpoint + '/' + rid;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ms-date': date,
        'x-ms-version': '2018-12-31',
        'x-ms-documentdb-partitionkey': '[\"current\"]',
        'x-ms-documentdb-isupsert': 'true',
        'Authorization': auth
      },
      body: JSON.stringify(doc)
    });
  }
}

// Model Router
class ModelRouter {
  selectModel(taskType: string): string {
    if (taskType === 'check_status' || taskType === 'simple_check') {
      return 'gpt-4.1-nano';
    }
    if (taskType === 'switch_channel' || taskType === 'medium') {
      return 'gpt-4.1-mini';
    }
    if (taskType === 'complex' || taskType === 'creative') {
      return 'gpt-4.1';
    }
    return 'gpt-4.1-mini';
  }
}

export class NarratorAgent {
  private llmEndpoint: string;
  private interval: number;
  private state: StreamState;
  private router: ModelRouter;
  private cosmos: CosmosClient;
  private followedChannels: string[] = ['KNIG04Ei', 'shroud', 'xqc', 'summit1g'];
  private channelIndex = 0;
  public lastDecision: string = 'none';
  public lastDecisionTime: Date = new Date();

  constructor(config: { llmEndpoint: string; interval?: number; cosmosEndpoint?: string; cosmosKey?: string }) {
    this.llmEndpoint = config.llmEndpoint;
    this.interval = config.interval || 30000;
    this.router = new ModelRouter();
    this.cosmos = new CosmosClient(config.cosmosEndpoint || process.env.COSMOS_ENDPOINT || '', config.cosmosKey || process.env.COSMOS_KEY || '');
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
    // 1. Read current state from shared Cosmos DB
    const shared = await this.cosmos.read('current');
    if (shared) {
      this.state = { ...this.state, ...shared };
      console.log('[Narrator] Current on-air:', this.state.channel, 'live:', this.state.isLive);
    } else {
      console.log('[Narrator] No shared state yet, defaulting to', this.state.channel);
    }

    // 2. Check if current channel is live
    const isLive = await this.checkStreamStatus(this.state.channel);

    // 3. Make decision
    const model = this.router.selectModel('check_status');
    console.log('[Narrator] Using model:', model);
    const decision = await this.makeDecision(isLive);
    await this.executeDecision(decision);

    // 4. Write state back to shared Cosmos DB
    await this.cosmos.upsert(this.state);
    console.log('[Narrator] State synced to Cosmos DB:', this.state.channel);
  }

  private async makeDecision(isLive: boolean): Promise<NarratorDecision> {
    if (!isLive) {
      this.channelIndex = (this.channelIndex + 1) % this.followedChannels.length;
      const nextChannel = this.followedChannels[this.channelIndex];
      console.log('[Narrator] Rotating to next channel:', nextChannel, '(index:', this.channelIndex + ')'); 
      return {
        action: 'SWITCH_CHANNEL',
        newState: { ...this.state, channel: nextChannel, isLive: true },
        reason: 'Stream offline - switched to ' + nextChannel
      };
    }
    const currentIdx = this.followedChannels.indexOf(this.state.channel);
    if (currentIdx !== -1) this.channelIndex = currentIdx;
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
      const resp = await fetch('https://gql.twitch.tv/gql', {
        method: 'POST',
        headers: { 'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko', 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ user(login: "' + channel + '") { stream { type } } }' })
      });
      const data = await resp.json();
      return !!(data.data && data.data.user && data.data.user.stream);
    } catch {
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
