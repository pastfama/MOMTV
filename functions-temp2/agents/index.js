// Azure Function proxy for AI Foundry agent endpoints
// Avoids CORS issues by making server-side requests

const FOUNDRY_ENDPOINT = "https://cog-cdwzd6d3oc77y.services.ai.azure.com/api/projects/resilient-steering-dev";
const API_KEY = process.env.FOUNDRY_API_KEY;
const FOUNDRY_SUBSCRIPTION_KEY = process.env.FOUNDRY_SUBSCRIPTION_KEY;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, api-key, X-Subscription-Key",
};

module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS_HEADERS };
    return;
  }

  const { agentName } = context.bindingData;
  const subPath = context.bindingData.path || "";

  // Build the target URL — Foundry Responses API v1
  const basePath = `${FOUNDRY_ENDPOINT}/agents/${agentName}/endpoint/protocols/openai/responses`;
  
  // Handle response ID polling
  let targetUrl;
  if (subPath) {
    // subPath could be a response ID like "resp_..." or "responses/resp_..."
    const cleanPath = subPath.replace(/^responses\//, "");
    targetUrl = `${basePath}/${cleanPath}`;
  } else {
    targetUrl = basePath;
  }

  // Forward query string (strip api-version if present, we always add it)
  const filteredQuery = Object.entries(req.query || {})
    .filter(([k]) => k !== "api-version")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const fullUrl = filteredQuery
    ? `${targetUrl}?api-version=v1&${filteredQuery}`
    : `${targetUrl}?api-version=v1`;

  // Build auth headers — try multiple methods
  const authHeaders = {};
  if (API_KEY) {
    authHeaders["api-key"] = API_KEY;
  } else if (FOUNDRY_SUBSCRIPTION_KEY) {
    authHeaders["X-Subscription-Key"] = FOUNDRY_SUBSCRIPTION_KEY;
  } else {
    // Fallback: try to use the request's Authorization header
    // This is needed when running locally with `azd ai agent run`
    if (req.headers?.authorization) {
      authHeaders["Authorization"] = req.headers.authorization;
    }
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
    };

    if (req.method === "POST" && req.body) {
      let body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      
      // Convert simple input string to Responses API format
      // Foundry expects: { input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "..." }] }] }
      if (typeof body.input === "string") {
        const text = body.input;
        body = {
          ...body,
          input: [{
            type: "message",
            role: "user",
            content: [{ type: "input_text", text }],
          }],
        };
      }
      
      fetchOptions.body = JSON.stringify(body);
      context.log(`[AgentProxy] POST ${agentName} — body keys: ${Object.keys(body).join(", ")}`);
    }

    context.log(`[AgentProxy] ${req.method} ${fullUrl}`);
    context.log(`[AgentProxy] Auth method: ${Object.keys(authHeaders).join(", ") || "NONE"}`);

    let response = await fetch(fullUrl, fetchOptions);
    let status = response.status;
    let responseText = await response.text();
    let body;
    try {
      body = JSON.parse(responseText);
    } catch {
      body = { raw: responseText };
    }

    // Log non-2xx responses for debugging
    if (status >= 400) {
      context.log.warn(`[AgentProxy] ${status} from Foundry: ${responseText.slice(0, 500)}`);
    }

    // If POST returned queued, poll server-side until completed
    if (req.method === "POST" && body && body.id && (body.status === "queued" || body.status === "in_progress")) {
      const pollUrl = `${basePath}/${body.id}?api-version=v1`;
      context.log(`[AgentProxy] Polling for response ${body.id} (status: ${body.status})`);
      
      for (let i = 0; i < 60; i++) { // 60 polls × 2s = 120s max
        await new Promise(r => setTimeout(r, 2000));
        const pollResp = await fetch(pollUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json", ...authHeaders },
        });
        const pollData = await pollResp.json().catch(() => null);
        
        if (pollData && (pollData.status === "completed" || pollData.status === "succeeded")) {
          context.log(`[AgentProxy] Response ${body.id} completed`);
          context.res = {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            body: pollData,
          };
          return;
        }
        
        if (pollData && pollData.status === "failed") {
          context.log.error(`[AgentProxy] Response ${body.id} FAILED: ${JSON.stringify(pollData).slice(0, 500)}`);
          context.res = {
            status: 502,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            body: { error: "Agent response failed", details: pollData },
          };
          return;
        }
        
        if (i % 5 === 0) {
          context.log(`[AgentProxy] Poll ${i + 1}: status=${pollData?.status || "unknown"}`);
        }
      }
      // Timeout — return what we have
      context.log.warn(`[AgentProxy] Polling timeout for ${body.id}`);
    }

    context.res = {
      status,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
      body,
    };
  } catch (err) {
    context.log.error(`[AgentProxy] Error: ${err.message}`);
    context.res = {
      status: 502,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: { error: err.message, agent: agentName, endpoint: fullUrl },
    };
  }
};