# 🎬 MOMTV — AI-Powered Cartoon TV Studio

> An open-source, persistent live TV studio that watches streams in real-time and produces AI commentary through animated cartoon anchors.

**This is NOT an AI video generator.** MOMTV is a live, always-on TV studio that:
- Watches a live stream (Twitch, Kick, YouTube)
- Monitors chat for hype and interesting moments
- AI anchors/commentators react and provide commentary
- Renders a virtual cartoon TV studio in the browser

## Architecture

```
Azure AI Foundry Project
├── 7 Prompt Agents (no code, just LLM + instructions + tools)
│   ├── Director (gpt-4o) — orchestrates, generates anchor scripts
│   ├── Stream Monitor (gpt-5-mini) — live stream tracking
│   ├── Content Analyzer (gpt-5-mini) — visual analysis
│   ├── Chat Pulse (gpt-5-nano) — sentiment analysis
│   ├── Show Producer (gpt-5-mini) — TV segment generation
│   ├── Art Director (gpt-5-nano) — visual identity
│   └── Meta-Agent (o3) — system health
├── 1 Toolbox (code interpreter, web search, A2A)
├── 8 Routines (server-side cron scheduling)
└── 3 Model Deployments (gpt-5-mini, gpt-5-nano, gpt-4o)

Browser Studio (Azure Static Web Apps)
├── TV Screen (embedded Twitch stream)
├── Anchors (Alex & Sasha with speech bubbles)
├── Commentary Feed + Sentiment Bar
└── News Ticker
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI Platform** | Azure AI Foundry |
| **AI Models** | GPT-5-mini, GPT-5-nano, GPT-4o, O3 |
| **Agent Type** | Prompt agents (no code containers) |
| **Tools** | Code Interpreter, Web Search, A2A |
| **Scheduling** | Foundry Routines (cron) |
| **Studio** | TypeScript + Vite + Azure Static Web Apps |
| **Characters** | CSS/SVG anchors with speech bubbles |
| **Chat** | Twitch IRC (anonymous), Kick WebSocket |
| **Stream Metadata** | Twitch GQL (public), Kick API (public) |

## Quick Start

### Prerequisites

- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
- [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
- Azure subscription

### 1. Clone & Login

```bash
git clone https://github.com/pastfama/MOMTV.git
cd MOMTV/resilient-steering
azd login
```

### 2. Deploy Infrastructure

```bash
azd up
```

This deploys:
- **Azure AI Foundry** project with 3 model deployments
- **Toolbox** (code interpreter, web search, A2A)
- **8 Routines** (server-side cron scheduling)

### 3. Create Prompt Agents

Agents are created via the Foundry MCP tools or portal (not via `azd deploy`):

```bash
# Via Azure MCP tool (in VS Code with Azure MCP server)
# Use agent_update with kind: "prompt" for each agent
# See AGENTS.md for agent definitions
```

### 4. Open Studio

The studio is deployed to Azure Static Web Apps. Open the URL printed by `azd up`.

## Pipeline

```
Every 5 min:
  stream-monitor → capture stream snapshot
  content-analyzer → analyze visual content
  chat-pulse → sentiment analysis
  director → generate anchor commentary

Every 10 min:
  show-producer → generate TV segments
  director → full coordination via A2A

Every 30 min:
  meta-agent → system health audit

Every hour:
  show-producer → hourly news bulletin
```

## Agent Output Format

All agents produce structured JSON. The Director outputs anchor scripts:

```json
{
  "type": "commentary",
  "alex": {"text": "what Alex says", "emotion": "professional"},
  "sasha": {"text": "what Sasha says", "emotion": "enthusiastic"},
  "ticker": "scrolling news text",
  "scene": {"type": "live", "title": "scene title"}
}
```

## Project Structure

```
MOMTV/
├── packages/
│   ├── shared/           # Shared TypeScript types (AnchorScript, Agent, etc.)
│   │   └── src/
│   │       ├── models.ts
│   │       └── events.ts
│   └── studio/           # Browser-based virtual studio
│       ├── index.html    # TV studio layout (screen, desk, anchors)
│       └── src/
│           ├── main.ts
│           ├── newsroom.ts    # Anchor speech bubbles, stream embed
│           └── agent-client.ts
├── resilient-steering/   # Azure AI Foundry infrastructure
│   ├── azure.yaml        # Toolbox + Routines (agents via MCP)
│   └── AGENTS.md
└── README.md
```

## License

MIT