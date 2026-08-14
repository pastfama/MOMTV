// Azure Function proxy for AI Foundry agent endpoints
// Avoids CORS issues by making server-side requests

const FOUNDRY_ENDPOINT = "https://cog-cdwzd6d3oc77y.services.ai.azure.com/api/projects/resilient-steering-dev";
const API_KEY = process.env.FOUNDRY_API_KEY;

module.exports = async function (context, req) {
  const { agentName } = context.bindingData;
  const subPath = context.bindingData.path || "";

  // Build the target URL
  // POST /api/agents/{agentName} → /agents/{agentName}/endpoint/protocols/openai/responses
  // GET /api/agents/{agentName}/{responseId} → /agents/{agentName}/endpoint/protocols/openai/responses/{responseId}
  const basePath = `${FOUNDRY_ENDPOINT}/agents/${agentName}/endpoint/protocols/openai/responses`;
  // If subPath looks like a response ID (starts with "resp_"), prepend /responses/
  const targetUrl = subPath
    ? subPath.startsWith("resp_")
      ? `${basePath}/${subPath}`
      : `${basePath}/${subPath}`
    : basePath;

  // Forward query string
  const qs = Object.entries(req.query || {})
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const fullUrl = qs ? `${targetUrl}?${qs}` : targetUrl;

  try {
    // Only send api-key — do NOT forward any Authorization header from browser.
    // The Foundry API rejects requests with conflicting auth (Bearer + api-key).
    const fetchOptions = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    };

    if (req.method === "POST" && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    context.log(`[AgentProxy] ${req.method} ${fullUrl}`);

    let response = await fetch(fullUrl, fetchOptions);
    let status = response.status;
    let responseText = await response.text();
    let body;
    try {
      body = JSON.parse(responseText);
    } catch {
      body = { raw: responseText };
    }

    // If this is a POST (create response), poll server-side until completed
    if (req.method === "POST" && body && body.id && body.status === "queued") {
      const pollUrl = `${basePath}/${body.id}?api-version=v1`;
      context.log(`[AgentProxy] Polling server-side for response ${body.id}`);
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const pollResp = await fetch(pollUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json", "api-key": API_KEY },
        });
        const pollData = await pollResp.json().catch(() => null);
        if (pollData && (pollData.status === "completed" || pollData.status === "succeeded" || pollData.status === "failed")) {
          context.log(`[AgentProxy] Response ${body.id} completed with status: ${pollData.status}`);
          context.res = {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: pollData,
          };
          return;
        }
        context.log(`[AgentProxy] Poll ${i + 1}: status=${pollData?.status || "unknown"}`);
      }
      // Timeout — return the initial response
      context.log(`[AgentProxy] Polling timeout for ${body.id}`);
    }

    context.res = {
      status,
      headers: {
        "Content-Type": "application/json",
      },
      body,
    };
  } catch (err) {
    context.log.error(`[AgentProxy] Error: ${err.message}`);
    context.res = {
      status: 502,
      headers: { "Content-Type": "application/json" },
      body: { error: err.message },
    };
  }
};