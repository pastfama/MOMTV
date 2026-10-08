# Changelog

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
