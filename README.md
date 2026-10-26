# 🎬 MOM TV — Live Stream Viewer

> A clean, always-on Twitch stream viewer with followed channels, chat, and simple analytics.

## Features

- **Stream Embed** — Embedded Twitch player with auto live/VOD switching
- **Twitch Login** — Sign in with the MOM TV Twitch app via a server-side authorization-code flow (legacy client-ID prompt only as fallback)
- **Google Login** — Sign in with Google via Azure Static Web Apps built-in auth (Easy Auth)
- **Live Followed Panel** — See which followed channels are live, click to switch
- **VOD Queue** — Browse and watch VODs with watched tracking
- **Twitch Chat** — Full chat embed in sidebar
- **Weazel News** — Live headlines + anchor snapshots from the Fameshire FiveM city
- **News Ticker** — Scrolling ticker bar (carries the Weazel News headlines)

### Metrics panel

The analytics strip along the bottom of the player. All of it is computed
client-side from data the page already receives — no extra API calls, no
backend, no persistence.

| Metric | Source |
|--------|--------|
| **Viewers** | `stream.viewersCount` from the 30s GQL poll |
| **Delta** | Change vs. previous poll, absolute **and** % (▲ green / ▼ red / ■ flat) |
| **Sparkline** | Last 12 viewer samples, scaled zero→peak, newest bar highlighted |
| **Average + trend** | Mean of the window, plus `▲12%` / `▼8%` / `steady` comparing recent vs. earlier half |
| **Uptime** | True stream age from Twitch's `stream.createdAt` (`started HH:MM:SS`) |
| **Chat msgs** | Total `PRIVMSG` lines seen on IRC |
| **Msgs/min** | Chat messages in a rolling 60s window, refreshed every 5s |
| **Peak** | Highest concurrent viewers this session, and when |
| **Followers** | `user.followers.totalCount` — rides along on the existing poll |
| **OCR** | Capture-worker status |

### How the metrics behave

- **Uptime is real, not page-relative.** It comes from Twitch's `stream.createdAt`,
  so it stays correct after a reload. If that field is missing it falls back to
  when the player was embedded, and the caption changes from `started` to
  `since` so you always know which one you're reading.
- **Delta shows a percentage** because `+2` is a big story at 10 viewers and
  noise at 10,000. Sub-2% moves read as `0%` rather than a dramatic arrow.
- **Trend is directional.** A single `avg` number hides whether a stream is
  climbing or fading, so the caption compares the recent half of the window
  against the earlier half and appends `▲12%` / `▼8%` / `steady`.
- **Metrics are per-channel and survive a refresh.** Switching channel saves the
  outgoing channel's numbers, clears the panel, then restores the incoming one's.
  State lives in `sessionStorage` (capped at the 10 most recent channels), so
  "peak" means "peak this browsing session", not "peak since the tab opened".
- **When the channel is offline** the viewer metric shows `—` / `offline` rather
  than leaving a stale count on screen looking current.

Note: chat metrics only populate when signed in to Twitch, since IRC counting
requires an OAuth token. The other metrics are public and work signed-out.

### Twitch Login (server-side OAuth)

Twitch sign-in is now a proper **authorization-code flow** handled by the
`/api/twitch` Azure Function. The client secret lives only in SWA app settings,
users no longer paste a Client ID, and tokens are revoked on logout.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/twitch/oauth-status` | `{ configured, clientId }` — lets the page pick the right flow |
| `GET /api/twitch/oauth-start` | 302 to Twitch `authorize` (code flow, `state` in an HttpOnly cookie), carries a same-origin-validated `redirect` |
| `GET /api/twitch/oauth-callback` | Validates state, exchanges the code using the secret, 302 back to the site with the token in the URL **fragment** (needed client-side for IRC chat + Helix; fragments never reach servers or history) |
| `GET /api/twitch/oauth-logout` | Best-effort revoke of the token at Twitch |

Scopes requested: `user:read:follows chat:read chat:edit`. If the app settings
aren't configured yet, `oauth-status` reports `configured: false` and the page
falls back to the old implicit-flow prompt — no breakage either way.

**One-time setup:**

1. At [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps), create an
   application named **MOM TV** with OAuth Redirect URL:
   `https://<your-swa-host>.azurestaticapps.net/api/twitch/oauth-callback`
2. Set the app settings:
   ```bash
   az staticwebapp appsettings set \
     --name momtv \
     --setting-names \
       TWITCH_OAUTH_CLIENT_ID="<Client ID>" \
       TWITCH_OAUTH_CLIENT_SECRET="<Client Secret>"
   ```
3. Verify: **Login with Twitch** should redirect straight to Twitch (no prompt),
   and logging out revokes the token.

### Google Login (Easy Auth)

The header offers **Login with Google** alongside **Login with Twitch**. It uses
Azure Static Web Apps' [built-in authentication](https://learn.microsoft.com/azure/static-web-apps/authentication-overview)
(Easy Auth) — there are no new dependencies, and the Google client secret never
touches the browser or the repo. The client just talks to:

| Endpoint | Purpose |
|----------|---------|
| `GET /.auth/me` | Restore the session → `{ clientPrincipal: { userId, userDetails, identityProvider } }` |
| `GET /.auth/login/google` | Redirect to Google consent, then back to the site |
| `GET /.auth/logout` | Clear the Easy Auth session cookie |

**One-time setup** (the buttons render regardless, but login only works after
this; until then they show an explanatory alert off-host):

1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials),
   create an **OAuth 2.0 Client ID** (type: *Web application*).
2. Add the authorized redirect URI:
   `https://momtv.fameshire.com/.auth/login/google/callback`
   (repeat for the `*.azurestaticapps.net` preview host if needed).
3. Configure the SWA with the credentials:
   ```bash
   az staticwebapp auth google update \
     --name momtv \
     --google-client-id "<CLIENT_ID>" \
     --google-client-secret "<CLIENT_SECRET>"
   ```
4. Verify: open the site → **Login with Google** → you should return signed in
   (avatar initial + display name in the header).

Twitch and Google sessions are independent: a Google session is shown only when
no Twitch user is signed in, and Twitch login continues to work exactly as before.

### Weazel News (live from the Fameshire FiveM city)

The sidebar carries a **🛰 WEAZEL NEWS** panel fed by the city's news desk
(`la_npc_ai/server/newsdesk.lua` on the FiveM server), and the bottom ticker
scrolls the same headlines. The page only ever reads JSON — **no game client
is required** to see the news.

| Piece | What it does |
|-------|--------------|
| **Publish** | The city's Weazel News desk POSTs each broadcast to `POST https://momtv.fameshire.com/api/reports` — `momtv-server.js` stores it in memory (capped at 200 items, CORS-open) |
| **Feed** | The site polls `GET https://momtv.fameshire.com/api/reports` → `{ feed: [{ headline, lead, image, time, studio }], count }` |
| **Panel** | Up to 5 cards, newest first: headline, lead sentence, anchor snapshot, studio + "Xm ago" stamp. The newest card is marked red while it is fresh. |
| **Ticker** | The bottom bar scrolls the 8 most recent Weazel News headlines. |
| **Polling** | Every 15 s. A failed fetch (city offline, CORS) leaves the last good render in place rather than blanking the panel. |
| **Override** | `localStorage.setItem('momtv_weazel_feed', '<url>')` points the panel at a different feed while developing. |

## Live

- **Custom Domain:** https://momtv.fameshire.com

## Current State (read this before assuming features exist)

The deployed site has two self-contained vanilla HTML pages:

- `packages/studio/index.html` — the **front page** (landing) served at
  `momtv.fameshire.com`: hero, program-guide cards, sign-in strip, live status
  pill and the Weazel News ticker.
- `packages/studio/tv.html` — the **viewer** (the original self-contained
  Twitch TV). Linked from the front page's "Watch Live" buttons.

Both are emitted to `dist/` by `vite build` (multi-page `rollupOptions.input`)
and served by the `momtv` App Service via `momtv-server.js`.

The repository also contains a TypeScript "AI-Powered Cartoon TV Studio" in
`packages/studio/src/` and `packages/shared/src/` (~300 KB). **None of it is
currently built or deployed.** `index.html` has no `<script type="module">`
entry point, so `vite build` bundles 2 modules and emits `index.html` alone.

Concretely, these are all currently dead code:

- `src/newsroom.ts` (the entry point named by `src/main.ts`)
- `src/studio.ts`, `src/agent-client.ts`, `src/agent-dashboard.ts`
- `src/eval-dashboard.ts`, `src/stream-watcher.ts`, `src/vi-client.ts`
- `src/world-narrator.ts`, `src/ws-client.ts`, `src/stream-analyzer.ts`
- `src/characters/*` (7 files)
- `packages/shared/src/*`
- `src/App.tsx`, `src/components/*` (added in 0b627cb, also unreferenced)

`vite.config.ts` proxies `/api`, `/ws` and `/health` to `http://localhost:3001`.
**No server in this repo serves 3001** — the backend for the studio code is
either external or not yet written. That is the blocker for deploying the
studio, not the frontend itself.

The code does typecheck and build clean (`pnpm typecheck`, `pnpm build`); it is
simply not reachable from the deployed entry point. See "Roadmap" below.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Deployed site** | Vanilla HTML/CSS/JS — `index.html` (front page) + `tv.html` (viewer) |
| **Studio (not deployed)** | TypeScript, Vite, React 18 (components only) |
| **Shared types** | TypeScript (`@momtv/shared`) |
| **Hosting** | Azure Static Web Apps (Standard tier) |
| **Domain** | Azure DNS (`fameshire.com`) |
| **Stream API** | Twitch GQL (public), Twitch Helix (OAuth) |
| **Chat** | Twitch IRC (OAuth) + Twitch embed chat |
| **CI/CD** | GitHub Actions → Azure Static Web Apps |
| **Backend services** | Azure AI Foundry, Video Indexer, Cosmos DB (`mom-narrator/`, `mom-vision/`) |

## Project Structure

```
MOMTV/
├── packages/
│   ├── shared/              # Shared TypeScript types (@momtv/shared)
│   │   └── src/             # models, events, characters, world-state, sim engine
│   └── studio/              # The site
│       ├── index.html       # Front page / landing — served at /
│       ├── tv.html          # Self-contained Twitch viewer — at /tv.html
│       ├── vite.config.ts   # Vite build config
│       ├── api/             # Azure Functions (agents, twitch, vision, …)
│       └── src/             # Studio TypeScript — currently NOT built
├── mom-narrator/           # LLM orchestrator service (Dockerfile)
├── mom-vision/              # Capture / OCR / audio workers (Bicep infra)
├── .github/workflows/
│   └── deploy-studio.yml    # GitHub Actions → Azure SWA
└── README.md
```

## Quick Start

**Just view the deployed site** — open https://momtv.fameshire.com (front page)
or https://momtv.fameshire.com/tv.html (viewer), or open
`packages/studio/index.html` / `packages/studio/tv.html` directly in a browser.
No build step needed.

**Work on the TypeScript:**

```bash
pnpm install
pnpm typecheck        # tsc --noEmit across all packages
pnpm build            # shared (tsc) + studio (vite)
pnpm studio           # vite dev server on :3000
```

Note that `pnpm studio` serves the landing page at `/` and the viewer at
`/tv.html` — the TypeScript has no entry point in either page yet.

## Deployment

1. Push to `main` branch
2. GitHub Actions runs `pnpm typecheck`, then builds, then deploys
3. Site is live at `momtv.fameshire.com`

CI runs a **typecheck gate** before build. This was added after a commit shipped
121 type errors (including a build-breaking `import Lottie from 'lottie-react'`)
that `vite build` alone did not catch.

## Roadmap

- [ ] Decide the studio backend: implement or locate the `localhost:3001` server
- [ ] Wire `src/main.ts` into `index.html` (or replace it) as a module entry point
- [ ] Confirm the studio renders correctly before it reaches production
- [ ] Prune or re-scope the unreferenced `App.tsx` / `components/*`

## Security Notes

- **Never commit credentials into `packages/studio/public/`.** Anything in
  `public/` is copied verbatim into `dist/` and deployed as a publicly readable
  static file. A Foundry API key was once committed there and served from
  production; the file has been removed and the key should be rotated.
- `.gitignore` lists `packages/studio/public/foundry-config.json`, but
  gitignoring a secret does not unpublish it — keep secrets out of `public/`
  entirely and use SWA managed settings or environment variables instead.

## History

### v0.5 — Retro CRT redesign *(current)*
- Full visual redesign: analog-TV aesthetic with phosphor glow, chunky cabinet bezel,
  power-on flash, scanlines and CRT OSD styling — plus the site's first responsive layout.
- No feature or behaviour changes.

### v0.4 — Weazel News + momtv.fameshire.com
- **Weazel News panel**: live headlines, lead sentences and anchor snapshots from the Fameshire FiveM city, polled every 15 s from `/la_npc_ai/weazel:getfeed`
- **Ticker** now scrolls the Weazel News headlines
- **Gagarin is gone**: every reference to the deleted `gagarin.fameshire.com` app removed — the site is `momtv.fameshire.com`, and the deploy secret is `AZURE_STATIC_WEB_APPS_API_TOKEN_MOMTV`

### v0.3 — Simplified Stream Viewer
- Stripped AI agents, anchors, commentary, sentiment bar
- Added simple analytics (viewer count, sparkline, uptime, chat counter)
- Deployed via Azure Static Web Apps
- Standard tier hosting

### v0.2 — AI-Powered TV Studio *(code present, not deployed)*
- Azure AI Foundry with 7 prompt agents
- Animated cartoon anchors (Alex & Sasha)
- Commentary feed, sentiment analysis, news ticker
- Video Indexer integration

### v0.1 — Initial Release
- Basic stream embed with chat

## License

MIT