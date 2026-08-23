# 🎬 MOM TV — Live Stream Viewer

> A clean, always-on Twitch stream viewer with followed channels, chat, and simple analytics.

## Features

- **Stream Embed** — Embedded Twitch player with auto live/VOD switching
- **Twitch Login** — OAuth login to access your followed channels
- **Live Followed Panel** — See which followed channels are live, click to switch
- **VOD Queue** — Browse and watch VODs with watched tracking
- **Twitch Chat** — Full chat embed in sidebar
- **Analytics** — Viewer count, sparkline, uptime, chat message counter
- **News Ticker** — Scrolling ticker bar

## Live

- **Custom Domain:** https://gagarin.fameshire.com
- **Direct URL:** https://proud-tree-0321da210.7.azurestaticapps.net

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML/CSS/JS (no build required) |
| **Hosting** | Azure Static Web Apps (Standard tier) |
| **Domain** | Azure DNS (`fameshire.com`) |
| **Stream API** | Twitch GQL (public), Twitch Helix (OAuth) |
| **Chat** | Twitch IRC (OAuth) + Twitch embed chat |
| **CI/CD** | GitHub Actions → Azure Static Web Apps |

## Project Structure

```
MOMTV/
├── packages/
│   ├── shared/              # Shared TypeScript types
│   └── studio/              # Stream viewer
│       ├── index.html       # Self-contained viewer (HTML/CSS/JS)
│       ├── vite.config.ts   # Vite build config
│       └── src/             # TypeScript source (agent features)
├── .github/workflows/
│   └── deploy-studio.yml    # GitHub Actions → Azure SWA
└── README.md
```

## Quick Start (Local)

Just open `packages/studio/index.html` in a browser. No build step needed.

## Deployment

1. Push to `main` branch
2. GitHub Actions builds and deploys to Azure Static Web Apps
3. Site is live at `gagarin.fameshire.com`

## History

### v0.3 — Simplified Stream Viewer
- Stripped AI agents, anchors, commentary, sentiment bar
- Added simple analytics (viewer count, sparkline, uptime, chat counter)
- Deployed to `gagarin.fameshire.com` via Azure Static Web Apps
- Standard tier hosting

### v0.2 — AI-Powered TV Studio
- Azure AI Foundry with 7 prompt agents
- Animated cartoon anchors (Alex & Sasha)
- Commentary feed, sentiment analysis, news ticker
- Video Indexer integration

### v0.1 — Initial Release
- Basic stream embed with chat

## License

MIT