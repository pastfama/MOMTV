// Azure Function: MOMTV Simulation API
// Provides endpoints for the simulation engine:
// - GET /api/simulation/state — get current world state
// - POST /api/simulation/tick — run a simulation tick
// - POST /api/simulation/event — inject an external event
// - GET /api/simulation/agents — get all agent states
// - GET /api/simulation/transactions — get recent transactions

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// In-memory world state (resets on cold start)
// In production, this would be stored in Azure Cosmos DB or Blob Storage
let worldState = {
  timestamp: Date.now(),
  stream: {
    isLive: false,
    viewers: 0,
    game: "Unknown",
    title: "",
    startedAt: null,
    uptime: 0,
  },
  chat: {
    sentiment: "neutral",
    sentimentScore: 0.5,
    messagesPerMinute: 0,
    uniqueChatters: 0,
    trending: [],
    recentMessages: [],
    toxicityLevel: "none",
  },
  agents: [
    { agentId: "director", name: "Director", role: "director", status: "idle", lastAction: "", lastActionTime: 0, goals: ["coordinate_all", "maximize_quality"], mood: "focused", fame: 100, airtimeMinutes: 0 },
    { agentId: "character-dmitri-volkov", name: "Дмитрий Волков", role: "anchor", status: "idle", lastAction: "", lastActionTime: 0, goals: ["maintain_lead", "compete_with_artem"], mood: "determined", fame: 85, airtimeMinutes: 0 },
    { agentId: "character-alex-morgan", name: "Alex Morgan", role: "anchor", status: "idle", lastAction: "", lastActionTime: 0, goals: ["maintain_lead", "build_reputation"], mood: "energetic", fame: 80, airtimeMinutes: 0 },
    { agentId: "character-irina-morozova", name: "Ирина Морозова", role: "analyst", status: "idle", lastAction: "", lastActionTime: 0, goals: ["surpass_dmitri", "deep_analysis"], mood: "analytical", fame: 70, airtimeMinutes: 0 },
    { agentId: "character-artem-sokolov", name: "Артём Соколов", role: "analyst", status: "idle", lastAction: "", lastActionTime: 0, goals: ["get_promoted", "become_lead"], mood: "ambitious", fame: 65, airtimeMinutes: 0 },
    { agentId: "character-sasha-taylor", name: "Sasha Taylor", role: "analyst", status: "idle", lastAction: "", lastActionTime: 0, goals: ["surpass_alex", "analytical_depth"], mood: "curious", fame: 72, airtimeMinutes: 0 },
    { agentId: "character-jordan-davis", name: "Jordan Davis", role: "host", status: "idle", lastAction: "", lastActionTime: 0, goals: ["viral_moments", "build_reputation"], mood: "energetic", fame: 60, airtimeMinutes: 0 },
    { agentId: "character-natalia-bondarenko", name: "Наталія Бондаренко", role: "correspondent", status: "idle", lastAction: "", lastActionTime: 0, goals: ["break_story", "gather_intel"], mood: "resourceful", fame: 55, airtimeMinutes: 0 },
    { agentId: "character-kirill-fedorov", name: "Кирилл Фёдоров", role: "producer", status: "idle", lastAction: "", lastActionTime: 0, goals: ["get_on_camera", "become_visible"], mood: "subtle", fame: 30, airtimeMinutes: 0 },
  ],
  events: [],
  schedule: {
    currentStudio: "",
    currentHour: new Date().getUTCHours(),
    isPrimetime: false,
    nextSlotIn: 0,
    studiosOnAir: [],
  },
  economy: {
    totalSupply: 10000,
    inflationRate: 0,
    prices: { promotion: 100, transfer: 250, training: 500, drama: 150, perk: 200 },
  },
  relationships: [],
  recentTransactions: [],
};

let eventCounter = 0;

function generateEventId() {
  eventCounter++;
  return `evt_${Date.now()}_${eventCounter}`;
}

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS_HEADERS };
    return;
  }

  const action = context.bindingData.action;

  try {
    switch (action) {
      case "state": {
        // GET /api/simulation/state — return current world state
        context.res = {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          body: worldState,
        };
        break;
      }

      case "tick": {
        // POST /api/simulation/tick — run a simulation tick
        // This would normally call the simulation engine
        // For now, just update timestamp and return state
        worldState.timestamp = Date.now();
        worldState.schedule.currentHour = new Date().getUTCHours();
        worldState.schedule.isPrimetime = 
          worldState.schedule.currentHour >= 7 && worldState.schedule.currentHour <= 21;

        context.res = {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          body: { message: "Tick completed", worldState },
        };
        break;
      }

      case "event": {
        // POST /api/simulation/event — inject an external event
        const event = req.body;
        if (!event || !event.type) {
          context.res = {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            body: { error: "Provide event with type field" },
          };
          return;
        }

        const worldEvent = {
          id: generateEventId(),
          timestamp: Date.now(),
          type: event.type,
          source: event.source || "external",
          description: event.description || "",
          severity: event.severity || 0.5,
          metadata: event.metadata || {},
        };

        worldState.events.push(worldEvent);
        if (worldState.events.length > 100) {
          worldState.events = worldState.events.slice(-100);
        }

        context.res = {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          body: { message: "Event recorded", event: worldEvent },
        };
        break;
      }

      case "agents": {
        // GET /api/simulation/agents — get all agent states
        context.res = {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          body: worldState.agents,
        };
        break;
      }

      case "transactions": {
        // GET /api/simulation/transactions — get recent transactions
        const limit = parseInt(req.query.limit) || 20;
        context.res = {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          body: worldState.recentTransactions.slice(-limit),
        };
        break;
      }

      default:
        context.res = {
          status: 404,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          body: { error: `Unknown action: ${action}` },
        };
    }
  } catch (err) {
    context.log.error(`[Simulation] Error: ${err.message}`);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: { error: err.message },
    };
  }
};