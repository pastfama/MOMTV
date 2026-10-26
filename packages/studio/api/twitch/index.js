// Azure Function proxy for Twitch API calls
// Bypasses CORS restrictions by making server-side requests

const TWITCH_GQL_URL = "https://gql.twitch.tv/gql";
const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

// ═══ OAuth (authorization-code flow, server-side MOM TV app) ═══
// Configure on the SWA:
//   TWITCH_OAUTH_CLIENT_ID / TWITCH_OAUTH_CLIENT_SECRET
//   TWITCH_OAUTH_REDIRECT_URI (optional — derived from the request origin)
const TWITCH_AUTHORIZE_URL = "https://id.twitch.tv/oauth2/authorize";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_REVOKE_URL = "https://id.twitch.tv/oauth2/revoke";
const TWITCH_HELIX_USERS_URL = "https://api.twitch.tv/helix/users";
const OAUTH_SCOPES = "user:read:follows chat:read chat:edit";
const OAUTH_STATE_COOKIE = "momtv_oauth_state";

const crypto = require("crypto");

function getOauthConfig() {
  const clientId = process.env.TWITCH_OAUTH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function getPublicOrigin(req) {
  try {
    return new URL(req.headers["x-ms-original-url"] || req.url).origin;
  } catch {
    return "";
  }
}

function getOauthRedirectUri(req) {
  return (
    process.env.TWITCH_OAUTH_REDIRECT_URI ||
    `${getPublicOrigin(req)}/api/twitch/oauth-callback`
  );
}

// Where the user's browser may be sent back to after the token exchange.
function isAllowedSiteRedirect(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname;
    return (
      host.endsWith(".azurestaticapps.net") ||
      host.endsWith(".fameshire.com") ||
      host === "fameshire.com" ||
      host === "localhost"
    );
  } catch {
    return false;
  }
}

function getCookie(header, name) {
  const match = (header || "").match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}


// Allowed Twitch domains for proxying
const ALLOWED_HOSTS = [
  "gql.twitch.tv",
  "usher.ttvnw.net",
  "vod-secure.twitch.tv",
  "video-weaver.fra02.hls.ttvnw.net",
  "video-weaver",
  ".hls.ttvnw.net",
];

function isAllowedUrl(url) {
  try {
    const host = new URL(url).hostname;
    return (
      host === "gql.twitch.tv" ||
      host === "usher.ttvnw.net" ||
      host === "static-cdn.jtvnw.net" ||
      host.endsWith(".hls.ttvnw.net") ||
      host.endsWith(".ttvnw.net") ||
      host.endsWith(".jtvnw.net") ||
      host === "vod-secure.twitch.tv"
    );
  } catch {
    return false;
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ─── OAuth action handlers ───

function oauthStatus(context) {
  const cfg = getOauthConfig();
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: { configured: !!cfg, clientId: cfg ? cfg.clientId : null },
  };
}

function oauthStart(context, req) {
  const cfg = getOauthConfig();
  if (!cfg) {
    context.res = {
      status: 501,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: { error: "Twitch OAuth is not configured on the server" },
    };
    return;
  }

  const siteRedirect =
    req.query.redirect && isAllowedSiteRedirect(req.query.redirect)
      ? req.query.redirect
      : `${getPublicOrigin(req)}/`;

  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: getOauthRedirectUri(req),
    scope: OAUTH_SCOPES,
    state,
  });

  context.res = {
    status: 302,
    headers: {
      Location: `${TWITCH_AUTHORIZE_URL}?${params.toString()}`,
      "Set-Cookie": `${OAUTH_STATE_COOKIE}=${state}; Path=/api/twitch; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
      ...CORS_HEADERS,
    },
  };
}

async function oauthCallback(context, req) {
  const cfg = getOauthConfig();
  if (!cfg) {
    context.res = {
      status: 501,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: { error: "Twitch OAuth is not configured on the server" },
    };
    return;
  }

  const siteRedirect =
    req.query.redirect && isAllowedSiteRedirect(req.query.redirect)
      ? req.query.redirect
      : `${getPublicOrigin(req)}/`;

  const clearState = {
    "Set-Cookie": `${OAUTH_STATE_COOKIE}=; Path=/api/twitch; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  };
  const backWith = (fragmentParams) => {
    context.res = {
      status: 302,
      headers: {
        Location: `${siteRedirect}#${fragmentParams.toString()}`,
        ...clearState,
      },
    };
  };

  const code = req.query.code;
  if (!code) {
    backWith(new URLSearchParams({ oauth_error: "missing_code" }));
    return;
  }
  const expectedState = getCookie(req.headers.cookie, OAUTH_STATE_COOKIE);
  if (!req.query.state || !expectedState || req.query.state !== expectedState) {
    backWith(new URLSearchParams({ oauth_error: "state_mismatch" }));
    return;
  }

  // Exchange the authorization code for a token (client secret stays here).
  try {
    const tokenRes = await fetch(TWITCH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: getOauthRedirectUri(req),
      }),
    });
    if (!tokenRes.ok) {
      context.log.error(
        `[TwitchOAuth] Token exchange failed: ${tokenRes.status}`
      );
      backWith(new URLSearchParams({ oauth_error: "token_exchange" }));
      return;
    }
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      backWith(new URLSearchParams({ oauth_error: "no_token" }));
      return;
    }

    // Identify the user so the site can pick up where it left off.
    let login = "";
    try {
      const userRes = await fetch(TWITCH_HELIX_USERS_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": cfg.clientId,
        },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.data && userData.data.length > 0) {
          login = userData.data[0].login || "";
        }
      }
    } catch {
      /* user lookup is best-effort */
    }

    // Hand the token to the page via the URL fragment: it is needed
    // client-side for IRC chat + Helix, and fragments never reach servers.
    const frag = new URLSearchParams({
      access_token: accessToken,
      client_id: cfg.clientId,
      server_flow: "1",
    });
    if (login) frag.set("login", login);
    backWith(frag);
  } catch (err) {
    context.log.error(`[TwitchOAuth] Callback error: ${err.message}`);
    backWith(new URLSearchParams({ oauth_error: "callback_failed" }));
  }
}

function oauthLogout(context, req) {
  const cfg = getOauthConfig();
  const token = req.query.token;
  // Best-effort revoke so the token stops working on Twitch's side too.
  if (cfg && token) {
    fetch(TWITCH_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        token,
      }),
    }).catch(() => {});
  }
  context.res = {
    status: 204,
    headers: CORS_HEADERS,
  };
}

module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS_HEADERS };
    return;
  }

  const action = context.bindingData.action;

  try {
    if (action === "gql") {
      // Proxy Twitch GQL API request
      const response = await fetch(TWITCH_GQL_URL, {
        method: "POST",
        headers: {
          "Client-Id": TWITCH_CLIENT_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      context.res = {
        status: response.status,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: data,
      };
    } else if (action === "fetch") {
      // Generic Twitch URL proxy — only allows Twitch domains
      const url = req.query.url;
      if (!url || !isAllowedUrl(url)) {
        context.res = {
          status: 400,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          body: { error: "Invalid or disallowed URL" },
        };
        return;
      }

      const response = await fetch(url);
      const contentType = response.headers.get("content-type") || "text/plain";

      if (contentType.startsWith("image/")) {
        // Return image as base64-encoded JSON to avoid binary corruption
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        context.res = {
          status: response.status,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          body: { base64, contentType },
        };
      } else {
        // Return text responses as-is
        const text = await response.text();
        context.res = {
          status: response.status,
          headers: { "Content-Type": contentType, ...CORS_HEADERS },
          body: text,
        };
      }
    } else if (action === "oauth-status") {
      oauthStatus(context);
    } else if (action === "oauth-start") {
      oauthStart(context, req);
    } else if (action === "oauth-callback") {
      await oauthCallback(context, req);
    } else if (action === "oauth-logout") {
      oauthLogout(context, req);
    } else {
      context.res = {
        status: 404,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: { error: `Unknown action: ${action}` },
      };
    }
  } catch (err) {
    context.log.error(`[TwitchProxy] Error: ${err.message}`);
    context.res = {
      status: 502,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: { error: err.message },
    };
  }
};