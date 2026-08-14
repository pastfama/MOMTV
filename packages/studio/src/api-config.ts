// ============================================================
// MOM TV — API Configuration
// ============================================================
// Centralizes API base URL. Points to the Azure SWA backend
// when running on surge.sh (static hosting), or uses relative
// paths when running on the SWA itself.
// ============================================================

const SWA_HOST = "kind-water-05b3b120f.7.azurestaticapps.net";

function getApiBase(): string {
  const hostname = window.location.hostname;

  // If running on Azure SWA (has /api functions), use relative paths
  if (hostname.includes("azurestaticapps.net") || hostname === "localhost") {
    return "";
  }

  // If running on surge.sh or other static host, point to SWA backend
  return `https://${SWA_HOST}`;
}

export const API_BASE = getApiBase();

/**
 * Build a full API URL from a relative path.
 * Example: apiUrl("/api/agents/director") → "https://...azurestaticapps.net/api/agents/director"
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}