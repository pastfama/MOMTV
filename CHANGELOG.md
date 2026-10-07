# Changelog

## v0.4.0 — Weazel News + momtv.fameshire.com

### Added
- **Weazel News panel** (`packages/studio/index.html`) — a live 🛰 WEAZEL NEWS section in
  the sidebar, fed by the Fameshire FiveM city's news desk
  (`la_npc_ai/server/newsdesk.lua`). Polls
  `GET https://momtv.fameshire.com/la_npc_ai/weazel:getfeed` every 15 s and renders up to
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
