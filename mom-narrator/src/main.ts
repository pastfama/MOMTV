// MOM Narrator - Connect to Cosmos DB and Twitch API
import { NarratorAgent } from './narrator/agent.js';
import { EventBus } from './orchestrator/event-bus.js';

const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT || '';
const COSMOS_KEY = process.env.COSMOS_KEY || '';

async function main() {
  console.log('[MOM Narrator] Starting...');
  console.log('[MOM Narrator] Cosmos:', COSMOS_ENDPOINT ? 'configured' : 'not configured');

  const narrator = new NarratorAgent({
    llmEndpoint: 'https://cog-cdwzd6d3oc77y.services.ai.azure.com',
    interval: 30000
  });

  await narrator.runLoop();
}

main().catch(console.error);
