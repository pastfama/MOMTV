# 🎬 MOMTV - AI-Powered Cartoon TV Studio

> An open-source, persistent live TV studio that watches streams in real-time and produces AI commentary through animated cartoon anchors.

**This is NOT an AI video generator.** MOMTV is a live, always-on TV studio that:
- Watches a live stream (Twitch, Kick, YouTube, VK Play Live)
- Understands what's happening via AI vision + audio transcription
- Monitors chat for hype and interesting moments
- AI anchors/commentators react and provide commentary
- Renders a virtual cartoon TV studio in the browser

## Architecture

```
Twitch/Kick/YouTube Stream
        ↓
┌─────────────────────────────────────────┐
│         MOMTV Backend (TypeScript)       │
│                                          │
│  Stream Capture → Frame Analysis (GPT-4o)│
│  Chat Monitor  → Whisper Transcription   │
│  Decision Engine (GPT-4o-mini)          │
│  Commentary Generation (GPT-4o)         │
│  TTS (Azure Speech Neural Voices)       │
└─────────────────┬───────────────────────┘
                  │ WebSocket
                  ↓
┌─────────────────────────────────────────┐
│      Browser Studio (HTML5 Canvas)       │
│                                          │
│  Rive Characters (Alex & Sasha)         │
│  Speech Bubbles + Ticker + Banners      │
└─────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Language** | TypeScript (latest) |
| **Backend** | Node.js 22+ |
| **AI Models** | Azure AI Foundry (OpenAI GPT-4o, Whisper, etc.) |
| **TTS** | Azure AI Speech (Neural Voices) |
| **Characters** | Rive (WASM animations with state machines) |
| **Studio Render** | HTML5 Canvas + CSS overlays |
| **Auth** | Microsoft Entra ID |
| **Event Bus** | In-memory EventEmitter (Redis optional) |
| **Stream Capture** | FFmpeg + Streamlink |
| **Chat** | Twitch IRC, Kick WebSocket, YouTube API |

## Supported Languages

- 🇺🇸 English
- 🇷🇺 Russian (Русский)
- 🇺🇦 Ukrainian (Українська)
- Extensible to any language supported by Azure AI models

## Supported Stream Platforms

- **Twitch** - Full IRC chat + stream capture
- **Kick** - WebSocket chat + stream capture
- **YouTube** - Live chat API + stream capture
- **VK Play Live** - Stream capture (Russian platform)

## Quick Start - Deploy to Azure

### Prerequisites

- Node.js 22+
- pnpm 9+
- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
- [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
- Azure subscription

### 1. Clone & Login

```bash
git clone https://github.com/pastfama/MOMTV.git
cd MOMTV
azd login
```

### 2. Deploy to Azure

```bash
azd up
```

This deploys:
- **Container Apps** backend (24/7 stream monitoring)
- **Static Web Apps** studio (browser UI)
- **Azure Cache for Redis** (event bus)
- **Azure AI Services** (GPT-4o, Whisper, Speech TTS)

### 3. Open in Browser

After deployment, open the studio URL printed by `azd up`:
```
https://momtv-studio-xxx.azurestaticapps.net
```

That's it! The AI agents are already watching the configured stream.

### 4. Configure Channels

Edit `azure.yaml` or re-deploy with:
```bash
azd env set WATCHED_CHANNELS "twitch:shroud:en,twitch:xqc:en,twitch:asilan:ru"
azd up
```

## Local Development

```bash
# Install dependencies
pnpm install

# Copy and edit environment config
cp .env.example .env

# Start backend
pnpm dev

# Start studio (in another terminal)
pnpm studio
```

Open http://localhost:3000

## Docker (Local)

```bash
docker-compose up
```

## Project Structure

```
MOMTV/
├── packages/
│   ├── shared/           # Shared TypeScript types
│   │   └── src/
│   │       ├── models.ts    # All data models
│   │       └── events.ts    # Event definitions
│   ├── backend/          # Node.js backend
│   │   └── src/
│   │       ├── index.ts         # Main entry + WebSocket server
│   │       ├── config/          # Configuration loader
│   │       ├── ai/
│   │       │   └── foundry-client.ts  # Azure AI Foundry wrapper
│   │       ├── ingestion/
│   │       │   ├── stream-capture.ts  # FFmpeg stream capture
│   │       │   └── chat-monitor.ts    # Twitch/Kick/YouTube chat
│   │       ├── pipeline/
│   │       │   └── orchestrator.ts    # Main AI pipeline
│   │       ├── tts/
│   │       │   └── speech-synthesizer.ts  # Azure Speech TTS
│   │       └── events/
│   │           └── event-bus.ts      # Event pub/sub
│   └── studio/           # Browser-based virtual studio
│       ├── index.html      # Studio layout (HTML/CSS)
│       └── src/
│           ├── main.ts         # Entry point
│           ├── studio.ts       # Main studio controller
│           ├── ws-client.ts    # WebSocket client
│           └── characters/
│               └── character-manager.ts  # Rive character loader
├── docker-compose.yml
├── .env.example
└── README.md
```

## Azure AI Foundry - Model Requirements

| Model | Purpose | Est. Monthly Cost/Stream |
|-------|---------|-------------------------|
| GPT-4o | Vision analysis + Commentary | ~$135 |
| GPT-4o-mini | Decision engine + Chat analysis | ~$15 |
| Whisper Large | Audio transcription | ~$155 |
| Azure Speech HD | Text-to-speech | ~$15 |
| **Total** | | **~$320/month/stream** |

## Adding New Agents

1. Create a Rive character animation (`.riv` file)
2. Add agent config to `backend/src/config/index.ts`:

```typescript
{
  id: "new-agent",
  name: "Agent Name",
  role: "correspondent",
  languages: ["en", "ru"],
  personality: {
    tone: "enthusiastic",
    expertise: ["topic1", "topic2"],
    catchphrases: { en: ["Hello!"], ru: ["Привет!"] },
    description: { en: "Description", ru: "Описание" },
  },
  character: {
    rivFile: "characters/new-agent.riv",
    color: "#22c55e",
    position: { x: 0.5, y: 0.55 },
    scale: 1.0,
    states: { idle: "Idle", talking: "Talking", walking: "Walking", excited: "Excited", thinking: "Thinking", pointing: "Pointing" },
  },
  voice: {
    provider: "azure-speech",
    voices: {
      en: { male: "en-US-GuyNeural", female: "en-US-JennyNeural" },
      ru: { male: "ru-RU-DmitryNeural", female: "ru-RU-SvetlanaNeural" },
    },
  },
}
```

3. Add speech bubble and nameplate elements in `studio/index.html`
4. Place `.riv` file in `studio/characters/`

## License

MIT

## Contributing

Contributions welcome! This project aims to be the open-source standard for AI-powered live TV commentary.
</path>
<task_progress>
- [x] Gather requirements and design preferences
- [x] Explore repo state
- [x] Research Azure AI Foundry capabilities and available models
- [x] Calculate model requirements for 24/7 Twitch stream analysis
- [x] Design architecture
- [x] Present plan
- [x] Get user confirmation on tech choices
- [x] Create shared types package (models + events)
- [x] Set up backend package
- [x] Implement Azure AI Foundry client wrapper
- [x] Implement stream ingestion (stream-capture + chat-monitor)
- [x] Implement AI analysis pipeline
- [x] Implement decision engine & commentary generation
- [x] Implement TTS integration
- [x] Implement event bus & WebSocket server
- [x] Set up studio (frontend) package
- [x] Build studio renderer (HTML5 + Rive characters)
- [x] Implement Rive character system
- [x] Create Docker configuration
- [x] Create README documentation
</task_progress>
</write_to_file>