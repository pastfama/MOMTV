// Azure Function: Capture State
// Relay between MOMTV frontend and mom-vision workers via Cosmos DB

const { CosmosClient } = require("@azure/cosmos");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT || "";
const COSMOS_KEY = process.env.COSMOS_KEY || "";
const DATABASE_ID = "stream-capture";
const CONTAINER_ID = "stream-state";

let cosmosClient = null;

function getCosmosClient() {
  if (!cosmosClient && COSMOS_ENDPOINT && COSMOS_KEY) {
    cosmosClient = new CosmosClient({
      endpoint: COSMOS_ENDPOINT,
      key: COSMOS_KEY,
    });
  }
  return cosmosClient;
}

module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS_HEADERS };
    return;
  }

  const client = getCosmosClient();
  if (!client) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: { error: "Cosmos DB not configured" },
    };
    return;
  }

  const container = client.database(DATABASE_ID).container(CONTAINER_ID);

  try {
    if (req.method === "GET") {
      // Read current stream state
      const { resource } = await container.item("current", "current").read();
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: resource || {
          id: "current",
          channel: "KNIG04Ei",
          isLive: true,
          vodId: null,
          vodTitle: null,
          updatedAt: new Date().toISOString(),
        },
      };
    } else if (req.method === "POST") {
      // Write stream state
      const body = req.body || {};
      const state = {
        id: "current",
        channel: body.channel || "KNIG04Ei",
        isLive: body.isLive !== false,
        vodId: body.vodId || null,
        vodTitle: body.vodTitle || null,
        updatedAt: new Date().toISOString(),
      };

      await container.items.upsert(state);

      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: { ok: true, state },
      };
    }
  } catch (err) {
    context.log.error(`[CaptureState] Error: ${err.message}`);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: { error: err.message },
    };
  }
};
