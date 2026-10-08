# Changelog

# Changelog

## v0.4.7 — Stream area min-height fix
- Added min-height:300px to .stream-area to guarantee the Twitch iframe has sufficient vertical space for autoplay, preventing clipping when the analytics panel consumes excess vertical space on narrow viewports.

## v0.4.5 — Twitch embed: increased size threshold for autoplay safety
## v0.4.5 — Twitch embed: increased size threshold for autoplay safety
- Increased the size threshold in the embed scheduler from 280x160 to 400x300 to match the CSS-enforced minimum iframe size, ensuring the player only mounts when the iframe is large enough to satisfy Twitch's autoplay size requirement.
- Updated comments to reflect the new threshold.

## v0.4.4 — Stream area min-width fix
- Added min-width:400px to .left-panel to ensure the Twitch iframe never shrinks below the 400px minimum required for autoplay, eliminating residual “size, viewport visibility” errors on narrow windows.

## v0.4.3 — Twitch embed: fallback button, size enforcement, listener safety
- Added a CSS-enforced minimum iframe size of 400×300px (Twitch's published autoplay minimum)
- Added a fallback “▶︎ Play” button that appears after a 15‑second delay if the Twitch player does not reach the “Playing” state, allowing the user to start the stream manually when autoplay is blocked
- Added a MutationObserver that watches for iframe `src` changes (e.g., channel/VOD switches) and reschedules the fallback timer
- Retained the existing autoplay‑safe mount scheduler (visible + sufficient size) and the bounded play‑pump that closes the player reference on “Playing” state, preventing the `MaxListenersExceededWarning: 11 Playing listeners` pile-up

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
