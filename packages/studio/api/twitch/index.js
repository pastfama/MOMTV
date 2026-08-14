// Azure Function proxy for Twitch API calls
// Bypasses CORS restrictions by making server-side requests

const TWITCH_GQL_URL = "https://gql.twitch.tv/gql";
const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

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

module.exports = async function (context, req) {
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
        headers: { "Content-Type": "application/json" },
        body: data,
      };
    } else if (action === "fetch") {
      // Generic Twitch URL proxy — only allows Twitch domains
      const url = req.query.url;
      if (!url || !isAllowedUrl(url)) {
        context.res = {
          status: 400,
          headers: { "Content-Type": "application/json" },
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
          headers: { "Content-Type": "application/json" },
          body: { base64, contentType },
        };
      } else {
        // Return text responses as-is
        const text = await response.text();
        context.res = {
          status: response.status,
          headers: { "Content-Type": contentType },
          body: text,
        };
      }
    } else {
      context.res = {
        status: 404,
        headers: { "Content-Type": "application/json" },
        body: { error: `Unknown action: ${action}` },
      };
    }
  } catch (err) {
    context.log.error(`[TwitchProxy] Error: ${err.message}`);
    context.res = {
      status: 502,
      headers: { "Content-Type": "application/json" },
      body: { error: err.message },
    };
  }
};