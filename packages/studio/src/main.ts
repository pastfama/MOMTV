// ============================================================
// MOM TV — Entry Point
// ============================================================

import { Newsroom } from "./newsroom.js";
import { initAuth, login, isLoggedIn } from "./auth.js";

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     📺 MOM TV — 60s Retro Studio 📺     ║");
  console.log("║  v7 - Auth + Vision Analysis             ║");
  console.log("╚══════════════════════════════════════════╝");

  // Initialize MSAL authentication
  const token = await initAuth();

  if (!token) {
    console.log("[Auth] No token — showing login prompt");
    showLoginButton();
  } else {
    console.log("[Auth] Token acquired — starting studio");
  }

  const newsroom = new Newsroom();
  await newsroom.init();

  // Expose for debugging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).momtvNewsroom = newsroom;
}

function showLoginButton(): void {
  const existing = document.getElementById("login-btn");
  if (existing) return;

  const btn = document.createElement("button");
  btn.id = "login-btn";
  btn.textContent = "🔐 Sign in to enable live analysis";
  btn.style.cssText = `
    position: fixed;
    bottom: 56px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    background: linear-gradient(135deg, #d4652f, #b85520);
    color: #fff;
    border: none;
    padding: 10px 24px;
    border-radius: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    transition: all 0.2s;
  `;
  btn.onmouseenter = () => { btn.style.transform = "translateX(-50%) scale(1.05)"; };
  btn.onmouseleave = () => { btn.style.transform = "translateX(-50%)"; };
  btn.onclick = async () => {
    const newToken = await login();
    if (newToken) {
      btn.remove();
      // Restart analysis now that we have a token
      console.log("[Auth] Login successful — analysis will start on next cycle");
    }
  };
  document.body.appendChild(btn);
}

main().catch((err) => {
  console.error("Failed to initialize newsroom:", err);
});