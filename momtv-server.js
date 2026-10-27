const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// ── Twitch OAuth implementation ───────────────────────────────────────────────
const TWITCH_AUTHORIZE_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_REVOKE_URL = 'https://id.twitch.tv/oauth2/revoke';
const TWITCH_HELIX_USERS_URL = 'https://api.twitch.tv/helix/users';
const OAUTH_SCOPES = 'user:read:follows chat:read chat:edit';
const OAUTH_STATE_COOKIE = 'momtv_oauth_state';

function getOauthConfig() {
  const clientId = process.env.TWITCH_OAUTH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

// App Service sits behind an HTTPS front end; the Host header is the public
// host. TWITCH_OAUTH_REDIRECT_URI overrides for non-standard setups.
function getOauthRedirectUri(req) {
  if (process.env.TWITCH_OAUTH_REDIRECT_URI) return process.env.TWITCH_OAUTH_REDIRECT_URI;
  const host = (req.headers && req.headers.host) || 'momtv.fameshire.com';
  return `https://${host}/api/twitch/oauth-callback`;
}

// Where the browser may be sent back to after the token exchange (open-redirect guard).
function isAllowedSiteRedirect(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname;
    return (
      host.endsWith('.azurestaticapps.net') ||
      host.endsWith('.fameshire.com') ||
      host === 'fameshire.com' ||
      host === 'localhost'
    );
  } catch {
    return false;
  }
}

function getCookie(header, name) {
  const match = (header || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// The post-login destination rides on a cookie set at oauth-start: the OAuth
// provider's authorize round-trip only passes back code/state, not our query
// params. Re-validated against the allow-list on read (defense in depth).
function readSiteRedirectCookie(req, name) {
  const raw = getCookie(req.headers.cookie, name);
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    if (isAllowedSiteRedirect(decoded)) return decoded;
  } catch { /* malformed — ignore */ }
  return null;
}

// ── Google OAuth implementation ──────────────────────────────────────────────
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_STATE_COOKIE = 'momtv_google_state';
const GOOGLE_SCOPES = 'openid email profile';

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function getGoogleRedirectUri(req) {
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const host = (req.headers && req.headers.host) || 'momtv.fameshire.com';
  return `https://${host}/api/google/oauth-callback`;
}

function handleGoogleOAuth(req, res, action) {
  const cfg = getGoogleConfig();

  if (action === 'oauth-status') {
    sendJson(res, 200, { configured: !!cfg, clientId: cfg ? cfg.clientId : null });
    return;
  }

  if (action === 'oauth-logout') {
    // Stateless: the page drops its saved profile; nothing to revoke server-side.
    res.writeHead(204, { 'Cache-Control': 'no-store' });
    res.end();
    return;
  }

  if (!cfg) {
    sendJson(res, 501, { error: 'Google OAuth is not configured on the server' });
    return;
  }

  const sp = new URL(req.url, 'http://x').searchParams;
  const siteRedirect =
    sp.get('redirect') && isAllowedSiteRedirect(sp.get('redirect'))
      ? sp.get('redirect')
      : `https://${(req.headers && req.headers.host) || 'momtv.fameshire.com'}/`;

  if (action === 'oauth-start') {
    const state = crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cfg.clientId,
      redirect_uri: getGoogleRedirectUri(req),
      scope: GOOGLE_SCOPES,
      state,
      prompt: 'select_account',
    });
    res.writeHead(302, {
      Location: `${GOOGLE_AUTH_URL}?${params.toString()}`,
      'Set-Cookie': [
        `${GOOGLE_STATE_COOKIE}=${state}; Path=/api/google; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
        `momtv_google_redirect=${encodeURIComponent(siteRedirect)}; Path=/api/google; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
      ],
    });
    res.end();
    return;
  }

  // oauth-callback
  const backWith = (frag) => {
    const siteRedirectCb =
      readSiteRedirectCookie(req, 'momtv_google_redirect') || siteRedirect;
    res.writeHead(302, {
      Location: `${siteRedirectCb}#${frag.toString()}`,
      'Set-Cookie': [
        `${GOOGLE_STATE_COOKIE}=; Path=/api/google; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
        'momtv_google_redirect=; Path=/api/google; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
      ],
    });
    res.end();
  };

  const code = sp.get('code');
  const err = sp.get('error');
  if (err) {
    backWith(new URLSearchParams({ google_error: 'denied' }));
    return;
  }
  if (!code) {
    backWith(new URLSearchParams({ google_error: 'missing_code' }));
    return;
  }
  const expectedState = getCookie(req.headers.cookie, GOOGLE_STATE_COOKIE);
  if (!sp.get('state') || !expectedState || sp.get('state') !== expectedState) {
    backWith(new URLSearchParams({ google_error: 'state_mismatch' }));
    return;
  }

  // Exchange the code for tokens; the profile comes from the id_token claims.
  (async () => {
    try {
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: getGoogleRedirectUri(req),
        }),
      });
      if (!tokenRes.ok) {
        console.error(`[GoogleOAuth] Token exchange failed: ${tokenRes.status}`);
        backWith(new URLSearchParams({ google_error: 'token_exchange' }));
        return;
      }
      const tokenData = await tokenRes.json();
      if (!tokenData.id_token) {
        backWith(new URLSearchParams({ google_error: 'no_id_token' }));
        return;
      }
      // id_token is a JWT: payload is the middle base64url segment.
      const payloadB64 = tokenData.id_token.split('.')[1];
      const claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      const frag = new URLSearchParams({
        google_user: '1',
        name: claims.name || claims.email || 'Google user',
        email: claims.email || '',
        picture: claims.picture || '',
      });
      backWith(frag);
    } catch (err) {
      console.error(`[GoogleOAuth] Callback error: ${err.message}`);
      backWith(new URLSearchParams({ google_error: 'callback_failed' }));
    }
  })();
}
function handleTwitchOAuth(req, res, action) {
  const cfg = getOauthConfig();

  if (action === 'oauth-status') {
    sendJson(res, 200, { configured: !!cfg, clientId: cfg ? cfg.clientId : null });
    return;
  }

  if (action === 'oauth-logout') {
    const token = new URL(req.url, 'http://x').searchParams.get('token');
    // Best-effort revoke so the token stops working on Twitch's side too.
    if (cfg && token) {
      fetch(TWITCH_REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: cfg.clientId, token }),
      }).catch(() => {});
    }
    res.writeHead(204, { 'Cache-Control': 'no-store' });
    res.end();
    return;
  }

  if (!cfg) {
    sendJson(res, 501, { error: 'Twitch OAuth is not configured on the server' });
    return;
  }

  const sp = new URL(req.url, 'http://x').searchParams;
  const siteRedirect =
    sp.get('redirect') && isAllowedSiteRedirect(sp.get('redirect'))
      ? sp.get('redirect')
      : `https://${(req.headers && req.headers.host) || 'momtv.fameshire.com'}/`;

  if (action === 'oauth-start') {
    const state = crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cfg.clientId,
      redirect_uri: getOauthRedirectUri(req),
      scope: OAUTH_SCOPES,
      state,
    });
    res.writeHead(302, {
      Location: `${TWITCH_AUTHORIZE_URL}?${params.toString()}`,
      'Set-Cookie': [
        `${OAUTH_STATE_COOKIE}=${state}; Path=/api/twitch; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
        `momtv_oauth_redirect=${encodeURIComponent(siteRedirect)}; Path=/api/twitch; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
      ],
    });
    res.end();
    return;
  }

  // oauth-callback
  const code = sp.get('code');
  const siteRedirectCb =
    readSiteRedirectCookie(req, 'momtv_oauth_redirect') || siteRedirect;
  const backWith = (frag) => {
    res.writeHead(302, {
      Location: `${siteRedirectCb}#${frag.toString()}`,
      'Set-Cookie': [
        `${OAUTH_STATE_COOKIE}=; Path=/api/twitch; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
        'momtv_oauth_redirect=; Path=/api/twitch; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
      ],
    });
    res.end();
  };

  if (!code) {
    backWith(new URLSearchParams({ oauth_error: 'missing_code' }));
    return;
  }
  const expectedState = getCookie(req.headers.cookie, OAUTH_STATE_COOKIE);
  if (!sp.get('state') || !expectedState || sp.get('state') !== expectedState) {
    backWith(new URLSearchParams({ oauth_error: 'state_mismatch' }));
    return;
  }

  // Exchange the authorization code for a token (the client secret stays here).
  (async () => {
    try {
      const tokenRes = await fetch(TWITCH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: getOauthRedirectUri(req),
        }),
      });
      if (!tokenRes.ok) {
        console.error(`[TwitchOAuth] Token exchange failed: ${tokenRes.status}`);
        backWith(new URLSearchParams({ oauth_error: 'token_exchange' }));
        return;
      }
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        backWith(new URLSearchParams({ oauth_error: 'no_token' }));
        return;
      }

      // Identify the user so the page can pick up where it left off (best-effort).
      let login = '';
      try {
        const userRes = await fetch(TWITCH_HELIX_USERS_URL, {
          headers: { Authorization: `Bearer ${accessToken}`, 'Client-Id': cfg.clientId },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.data && userData.data.length > 0) login = userData.data[0].login || '';
        }
      } catch { /* user lookup is best-effort */ }

      // Hand the token to the page via the URL fragment.
      const frag = new URLSearchParams({
        access_token: accessToken,
        client_id: cfg.clientId,
        server_flow: '1',
      });
      if (login) frag.set('login', login);
      backWith(frag);
    } catch (err) {
      console.error(`[TwitchOAuth] Callback error: ${err.message}`);
      backWith(new URLSearchParams({ oauth_error: 'callback_failed' }));
    }
  })();
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

  // ── Google OAuth (same-origin authorization-code flow) ─────────────────────
  // Mirrors the Twitch flow: the client secret lives only in this process's
  // env (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET), and the profile
  // is handed to the page via the URL fragment.
  const GOOGLE_API_MATCH = url.match(/^\/api\/google\/(oauth-status|oauth-start|oauth-callback|oauth-logout)$/);
  if (GOOGLE_API_MATCH) {
    handleGoogleOAuth(req, res, GOOGLE_API_MATCH[1]);
    return;
  }

  // ── Twitch OAuth (authorization-code flow, server-side MOM TV app) ─────────
  // Mirrors packages/studio/api/twitch: the client secret lives only in this
  // process's env (TWITCH_OAUTH_CLIENT_ID / TWITCH_OAUTH_CLIENT_SECRET), and
  // the token is handed to the page via the URL fragment (needed client-side
  // for IRC chat + Helix; fragments never reach servers or logs).
  const TWITCH_API_MATCH = url.match(/^\/api\/twitch\/(oauth-status|oauth-start|oauth-callback|oauth-logout)$/);
  if (TWITCH_API_MATCH) {
    handleTwitchOAuth(req, res, TWITCH_API_MATCH[1]);
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

