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

## Foundry Evaluation Pipeline

### Custom Rubric Evaluators (5)
| Evaluator | Type | Threshold | Purpose |
|-----------|------|-----------|---------|
| `momtv-anchor-quality` | ordinal 1-5 | ≥ 3.0 | Anchor script quality, dialogue flow, Russian language |
| `momtv-sentiment-accuracy` | continuous 0-1 | ≥ 0.6 | Chat sentiment analysis accuracy |
| `momtv-show-coherence` | ordinal 1-5 | ≥ 3.0 | Show segment flow, narrative structure |
| `momtv-breaking-news-relevance` | boolean | ≥ 0.5 | Breaking news false positive prevention |
| `momtv-safety-check` | boolean | ≥ 0.5 | Russian content safety/broadcast compliance |

### Evaluation Suites (3)
| Suite | Target Agent | Evaluators |
|-------|-------------|------------|
| `momtv-anchor-quality-suite` | show-producer | anchor-quality, show-coherence, breaking-news-relevance |
| `momtv-sentiment-suite` | chat-pulse | sentiment-accuracy, safety-check |
| `momtv-full-production-suite` | director | All 5 custom + coherence, fluency, groundedness |

### Batch Evaluations (Synthetic Data)
- **synthetic-dialogue-eval** — show-producer with 25 synthetic queries
- **synthetic-sentiment-eval** — chat-pulse with 25 synthetic queries

### Continuous Evaluation
Requires **Foundry User role** assignment (data-plane role, not ARM RBAC).
Enable via: **Azure AI Foundry Portal** → Project Settings → Access Control → Add member → assign "Foundry User" role.

ARM-level roles (Contributor, Cognitive Services User, Azure AI Developer) do NOT satisfy this requirement — it must be done through the Foundry portal UI.

### Frontend
The SWA frontend (`packages/studio/`) now includes an **Eval Dashboard** panel
that displays evaluator catalog, evaluation suites, recent runs, and continuous eval status.

This project was built with the microsoft-foundry skill. Before working on or answering questions about foundry agents, read the microsoft-foundry skill first.
