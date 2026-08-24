// ============================================================
// mom-vision — OCR Worker Entry Point
// ============================================================

import http from 'http';
import { CapturePipeline } from '../../capture/index.js';

const channel = process.env.CURRENT_CHANNEL || 'KNIG04Ei';

console.log(`[OCR Worker] Initializing for channel: ${channel}`);

// ── HTTP API Server (start first) ────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));

    } else if (url.pathname === '/api/state' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'current',
        channel,
        isLive: true,
        vodId: null,
        vodTitle: null,
        updatedAt: new Date().toISOString(),
      }));

    } else if (url.pathname === '/api/state' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });

    } else if (url.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        channel,
        isRunning: true,
        lastOcr: 0,
        lastAudio: 0,
        totalCaptures: 0,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }));

    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
});

const PORT = process.env.PORT || 80;
server.listen(PORT, () => {
  console.log(`[OCR Worker] API server listening on port ${PORT}`);
  console.log(`[OCR Worker] Endpoints: GET /health, GET/POST /api/state, GET /api/status`);
});

// Start capture pipeline after server is up
try {
  const pipeline = new CapturePipeline({
    ocrIntervalMs: 5_000,
    currentChannel: channel,
  });
  pipeline.start(channel);
  console.log(`[OCR Worker] Capture pipeline started for ${channel}`);
} catch (err) {
  console.error(`[OCR Worker] Pipeline failed to start:`, err);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[OCR Worker] Shutting down...');
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[OCR Worker] Interrupted...');
  server.close();
  process.exit(0);
});
