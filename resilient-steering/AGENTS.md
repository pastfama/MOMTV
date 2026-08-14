# MOMTV — AI-Powered 24/7 TV Network About Live Streamers

## Project Overview
MOMTV is a self-expanding multi-agent system built on Azure AI Foundry that monitors live streams across Twitch, YouTube, and Kick, and produces 24/7 TV content about streamers — entirely in Russian.

## Architecture
- **Platform**: Azure AI Foundry (Hosted Agents)
- **Protocol**: Responses (server-side conversation state)
- **Language**: Python 3.13
- **Primary Language**: Russian (ru-RU)
- **Models**: GPT-5-mini (analysis), GPT-5-nano (sentiment), o3 (meta-agent)

## Agents
| Agent | Purpose | Status | Model |
|-------|---------|--------|-------|
| **Director** | **Central orchestrator — coordinates all agents** | ✅ Active | **o3** |
| Stream Monitor | 24/7 live stream monitoring | ✅ Active | GPT-5-mini |
| Content Analyzer | Deep stream content analysis (OCR, game detection) | ✅ Active | GPT-5-mini |
| Chat Pulse | Real-time chat sentiment analysis | ✅ Active | GPT-5-nano |
| Show Producer | TV show generation | ✅ Active | GPT-5-mini |
| Art Director | Visual evolution engine | ✅ Active | GPT-5-nano |
| Meta-Agent | Self-expanding code rewriter | ✅ Active | o3 |

## Key Commands
```bash
# Provision and deploy
azd provision --no-prompt
azd deploy --no-prompt

# Run locally
azd ai agent run --no-client

# Invoke
azd ai agent invoke "Начни мониторинг стрима shroud на Twitch"

# Evaluate
azd ai agent eval run
```

This project was built with the microsoft-foundry skill. Before working on or answering questions about foundry agents, read the microsoft-foundry skill first.