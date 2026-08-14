// ============================================================
// MOM TV — Entry Point
// ============================================================

import { Newsroom } from "./newsroom.js";

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     📺 MOM TV — 24/7 Stream Monitor 📺   ║");
  console.log("║  v3 - API Key Auth (No Login)            ║");
  console.log("╚══════════════════════════════════════════╝");

  const newsroom = new Newsroom();
  await newsroom.init();

  // Expose for debugging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).momtvNewsroom = newsroom;
}

main().catch((err) => {
  console.error("Failed to initialize newsroom:", err);
});