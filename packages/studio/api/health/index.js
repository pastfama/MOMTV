// Health check endpoint for MOMTV monitoring
// Returns status of all backend services

const FOUNDRY_ENDPOINT = "https://cog-cdwzd6d3oc77y.services.ai.azure.com/api/projects/resilient-steering-dev";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS_HEADERS };
    return;
  }

  const checks = {};
  const startTime = Date.now();

  // 1. Check Foundry Agent Proxy
  try {
    const agentResp = await fetch(
      `${FOUNDRY_ENDPOINT}/agents/director?api-version=v1`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );
    checks.foundry_agent = { status: agentResp.ok ? "healthy" : "degraded", http: agentResp.status };
  } catch (err) {
    checks.foundry_agent = { status: "unreachable", error: err.message };
  }

  // 2. Check Vision API
  const visionKey = process.env.VISION_KEY || process.env.FOUNDRY_API_KEY;
  const visionEndpoint = process.env.VISION_ENDPOINT || "https://cog-cdwzd6d3oc77y.cognitiveservices.azure.com";
  try {
    if (visionKey) {
      checks.vision_api = { status: "configured", endpoint: visionEndpoint };
    } else {
      checks.vision_api = { status: "not_configured", message: "VISION_KEY or FOUNDRY_API_KEY not set" };
    }
  } catch (err) {
    checks.vision_api = { status: "error", error: err.message };
  }

  // 3. Check Video Indexer
  const viToken = process.env.VI_ACCESS_TOKEN || process.env.AZURE_ACCESS_TOKEN;
  checks.video_indexer = viToken
    ? { status: "configured" }
    : { status: "not_configured", message: "VI_ACCESS_TOKEN not set (IMDS auth may work in Azure)" };

  // 4. Check Twitch proxy
  try {
    const twitchResp = await fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: { "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko", "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ __typename }" }),
    });
    checks.twitch_gql = { status: twitchResp.ok ? "healthy" : "degraded", http: twitchResp.status };
  } catch (err) {
    checks.twitch_gql = { status: "unreachable", error: err.message };
  }

  // 5. Check Azure Functions environment
  checks.environment = {
    node_version: process.version,
    functions_worker: process.env.FUNCTIONS_WORKER_RUNTIME || "unknown",
    region: process.env.AWS_REGION || process.env.LOCATION || "unknown",
  };

  const durationMs = Date.now() - startTime;

  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: {
      status: "ok",
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
      checks,
    },
  };
};