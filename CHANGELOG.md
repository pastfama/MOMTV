# Changelog

## v0.5.1 — Fix: live stream no longer flips to VODs within seconds
- **Stale-poll race:** `checkStream()` fires at page load and its GQL response was not
  guarded against the viewer switching channels meanwhile. A stale response for the old
  (offline) channel — often the reason the viewer just switched to a live one — hit the
  `!live && isLive` branch and flipped the new stream into VODs within seconds. Poll
  responses are now snapshotted (channel + live intent at request time) and dropped if
  either changed.
- **Reruns read as offline:** GQL reports rerun streams with `type:"rerun"`, which the
  `type === "live"` check treated as offline — flipping a playing rerun into VODs on every
  poll. Reruns now count as live.
- **Single-poll auto-switch debounce:** one offline report no longer auto-plays a VOD while
  the viewer is actively watching. If a poll has confirmed the stream live, two consecutive
  offline polls (~60s) are required; if the stream was never confirmed live (page loaded on
  an offline channel), the drop to VODs stays immediate.

## v0.5.0 — Retro CRT redesign
- Full visual redesign of the viewer (`packages/studio/index.html`): analog-TV aesthetic —
  phosphor-green palette, `VT323` display font (replaces Space Grotesk), chromatic-aberration
  logo, ON AIR lamp, CRT OSD-style stream badges and metrics strip, amber news marquee.
- **Chunky TV cabinet bezel** wraps the whole app (`.app` border + bezel ring + inset shadow),
  with a power-on flash, scanline/flicker overlay and curvature vignette.
- **Responsive layout added** — previously there were no media queries at all: the grid now
  narrows at 1100px and stacks (stream above sidebar) at 860px. The stacked mobile layout
  wins over the inline grid template that `applySettings()` writes via `!important`, and the
  chat section height is likewise pinned at 45vh on phones.
- Embed mount floor is adaptive: `embedIframeReady()` now accepts a 300×220 iframe on
  viewports < 860px (phones), keeping the 400×300 floor on desktop so Twitch's autoplay
  policy is still satisfied.
- **No behaviour changes** — every feature (Twitch login, followed channels, VODs, chat,
  Weazel News, metrics) and every JS hook (element IDs, toggled classes) is untouched.

## v0.4.12 — Layout fix: Weazel banner gets its own grid row
- **Root cause of the broken layout:** the Weazel News banner is a direct child of `.app`, but `.app`'s grid only defined 3 rows (`56px 1fr 32px`). CSS auto-placement therefore put the **banner into the 1fr middle row** (stretching it across the whole viewport) and **squashed `.main` — the stream, chat, and VODs — into the 32px footer row**, which is why nothing appeared.
- Fixed by changing `.app` to `grid-template-rows:56px auto 1fr 32px;`: header 56px, banner its natural ~44px height, **`.main` gets the full 1fr middle**, ticker 32px.
- Cleaned up stray/duplicate CSS declarations from earlier inserts (floating `min-height:300px;`, duplicate `min-width:400px;` in `.left-panel`).


## v0.4.10 — Stream area size guarantees
- Added min-width:400px to .left-panel to ensure the stream container never shrinks below 400px.
- Added min-height:300px to .stream-area to guarantee sufficient vertical space for the Twitch iframe.
- Increased iframe minimum size to 400×300px to match Twitch's autoplay requirement.
## v0.4.2 — Twitch embed: autoplay-safe mount + listener cleanup
- Stream embed no longer sets `src` eagerly: it is mounted only once the tab is visible and the iframe has a real layout box (>= 280x160), fixing the "Autoplay … not met: size, viewport visibility" rejection
- Adds a CSS size floor for the embed iframe
- Bounded post-mount play-pump uses the documented Twitch JS player API (`getCurrentPlayer` / `play`) and stops + `close()`s the player reference the moment status is "Playing" — releases the API listeners behind the `MaxListenersExceededWarning: 11 Playing listeners` pile-up
- Drops the deprecated `encrypted-media` entry from the iframe `allow` attribute (was logging Feature Policy warnings)

## v0.4.1 — Weazel News banner, demo fill, cache fix

## v0.4.0 — Weazel News + momtv.fameshire.com

### Added
- **Weazel News panel** (`packages/studio/index.html`) — a live 🛰 WEAZEL NEWS section in
  the sidebar, fed by the Fameshire FiveM city's news desk
  (`la_npc_ai/server/newsdesk.lua`). The city POSTs each broadcast to
  `https://momtv.fameshire.com/api/reports`; the site polls the same endpoint back every
  15 s and renders up to
  5 cards (headline, lead sentence, anchor snapshot, studio, "Xm ago"); the newest card is
  marked red while it is fresh. **No game client is required** — the page only reads JSON.
- **News ticker** now scrolls the 8 most recent Weazel News headlines.
- **Feed override** for development: `localStorage.setItem('momtv_weazel_feed', '<url>')`.
- **Graceful degradation** — a failed fetch (city offline, CORS) leaves the last good
  render in place rather than blanking the panel.

### Removed
- **Every Gagarin reference.** The `gagarin.fameshire.com` Static Web App is deleted and
  no longer referenced anywhere: the site is `momtv.fameshire.com`, the deploy workflow is
  *Deploy MOM TV to momtv.fameshire.com*, and the deployment secret is
  `AZURE_STATIC_WEB_APPS_API_TOKEN_MOMTV`.
- Dead direct URL (`proud-tree-0321da210.7.azurestaticapps.net`) from the README.

### Cleanup
- Removed the temporary Azure Functions folders (`functions-fix/`, `functions-temp/`,
  `functions-temp2/`) and the stray `func-body.json`.

### Upgrade notes
- Set the `AZURE_STATIC_WEB_APPS_API_TOKEN_MOMTV` GitHub secret to the new Static Web
  App's deployment token before the next push to `main`.
- Point DNS for `momtv.fameshire.com` at the new Static Web App.

## v0.3.0 — Simplified Stream Viewer
- Stripped AI agents, anchors, commentary, sentiment bar
- Added simple analytics (viewer count, sparkline, uptime, chat counter)
