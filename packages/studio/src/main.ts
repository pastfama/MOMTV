// ============================================================
// MOMTV Studio - Entry Point
// ============================================================

import { Studio } from "./studio.js";

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     🎬 MOMTV Studio - Browser View 🎬    ║");
  console.log("╚══════════════════════════════════════════╝");

  const studio = new Studio();
  await studio.init();

  // Expose for debugging
  (window as Record<string, unknown>)["momtvStudio"] = studio;
}

main().catch((err) => {
  console.error("Failed to initialize studio:", err);
});