// ============================================================
// MOM TV — Entry Point
// ============================================================

import { Newsroom } from "./newsroom.js";

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     📺 MOM TV — 60s Retro Studio 📺     ║");
  console.log("║  v8 - No Azure Auth Required             ║");
  console.log("╚══════════════════════════════════════════╝");

  // Start studio — no Azure auth required
  // Agent integration connects via the Azure SWA backend proxy
  const newsroom = new Newsroom();
  await newsroom.init();

  // Expose for debugging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).momtvNewsroom = newsroom;
}

main().catch((err) => {
  console.error("Failed to initialize newsroom:", err);
});
