const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 80;
const STATIC_DIR = path.join(__dirname, 'dist');

// ── Weazel News feed (in memory) ──────────────────────────────────────────────
// The Fameshire FiveM city POSTs a news item here every time an anchor goes on
// air (la_npc_ai/server/newsdesk.lua → https://momtv.fameshire.com/api/reports).
// The site polls the same endpoint back to render the WEAZEL NEWS panel and
// the bottom ticker. Kept in memory (restart clears it), capped at 200 items.
const FEED_LIMIT = 200;
const feed = [];

function addFeedItem(item) {
  feed.unshift({
    headline: String(item.headline || '').slice(0, 200),
    lead: String(item.lead || '').slice(0, 300),
    image: String(item.image || '').slice(0, 500),
    studio: String(item.studio || '').slice(0, 120),
    time: Number(item.time) || Number(item.timestamp) || Math.floor(Date.now() / 1000),
  });
  while (feed.length > FEED_LIMIT) feed.pop();
}

function sendJson(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req, cb) {
  let data = '';
  req.on('data', (chunk) => { data += chunk; });
  req.on('end', () => cb(data));
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];

  // CORS preflight for the feed (the city posts from the FiveM server)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  // POST /api/reports — the Weazel News desk publishes one item per broadcast
  if (req.method === 'POST' && (url === '/api/reports' || url === '/api/report')) {
    readBody(req, (data) => {
      let item = null;
      try { item = JSON.parse(data); } catch (e) { /* ignore bad json */ }
      if (item && typeof item === 'object') {
        addFeedItem(item);
        sendJson(res, 201, { ok: true, count: feed.length });
      } else {
        sendJson(res, 400, { ok: false, error: 'invalid JSON' });
      }
    });
    return;
  }

  // GET /api/reports — the site polls this for the WEAZEL NEWS panel + ticker
  if (req.method === 'GET' && (url === '/api/reports' || url === '/api/weazel')) {
    sendJson(res, 200, { feed, count: feed.length });
    return;
  }

  // Everything else: static files from ./dist with an SPA fallback
  let filePath = path.join(STATIC_DIR, url === '/' ? 'index.html' : url);

  // SPA fallback: if file doesn't exist, serve index.html
  if (!fs.existsSync(filePath)) {
    filePath = path.join(STATIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    // Cache policy: HTML revalidates quickly so UI deploys land fast.
    const cacheControl = ext === '.html'
      ? 'no-cache'
      : 'public, max-age=3600';
    res.writeHead(200, {
      'Content-Type': contentType + (ext === '.html' ? '; charset=utf-8' : ''),
      'Cache-Control': cacheControl,
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`MOMTV server running on port ${PORT}`);
});

