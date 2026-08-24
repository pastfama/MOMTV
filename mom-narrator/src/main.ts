import http from 'http';
import { NarratorAgent } from './narrator/agent.js';

const FOUNDRY_ENDPOINT = 'https://fameshire-foundry-resource.services.ai.azure.com/api/projects/fameshire-foundry';

const narrator = new NarratorAgent({
  llmEndpoint: FOUNDRY_ENDPOINT,
  interval: 30000,
  cosmosEndpoint: process.env.COSMOS_ENDPOINT,
  cosmosKey: process.env.COSMOS_KEY
});

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify(narrator.getStatus()));
  } else if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = process.env.PORT || 80;
server.listen(PORT, () => {
  console.log('[Narrator] API server on port ' + PORT);
  console.log('[Narrator] Foundry: ' + FOUNDRY_ENDPOINT);
});

narrator.runLoop().catch(console.error);
