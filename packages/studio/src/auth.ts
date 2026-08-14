// ============================================================
// MOM TV — Azure AD Authentication (MSAL)
// ============================================================
// Handles Microsoft login for Foundry agent authentication.
// ============================================================

import type { Configuration } from "@azure/msal-browser";
// Dynamic import to prevent tree-shaking by Vite

const MSAL_CONFIG: Configuration = {
  auth: {
    clientId: "ca058344-901c-4233-bf0a-e88a21df7068",
    authority: "https://login.microsoftonline.com/185b412d-bddc-454b-9987-40628582c63c",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

const SCOPES = ["https://cognitiveservices.azure.com/.default"];

let msalInstance: any = null;
let currentToken: string | null = null;

export async function initAuth(): Promise<string | null> {
  const { PublicClientApplication } = await import("@azure/msal-browser");
  msalInstance = new PublicClientApplication(MSAL_CONFIG);

  try {
    await msalInstance.initialize();

    // Handle redirect response (after login)
    const response = await msalInstance.handleRedirectPromise();
    if (response) {
      currentToken = response.accessToken;
      console.log("[Auth] Login successful, token acquired");
      return currentToken;
    }

    // Check for existing session
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
      try {
        const tokenResponse = await msalInstance.acquireTokenSilent({
          scopes: SCOPES,
          account: accounts[0],
        });
        currentToken = tokenResponse.accessToken;
        console.log("[Auth] Token refreshed silently");
        return currentToken;
      } catch {
        // Silent token acquisition failed, need interactive login
        console.log("[Auth] Silent token failed, login required");
        return null;
      }
    }

    return null;
  } catch (err) {
    console.error("[Auth] MSAL initialization failed:", err);
    return null;
  }
}

export async function login(): Promise<string | null> {
  if (!msalInstance) {
    console.error("[Auth] MSAL not initialized");
    return null;
  }

  try {
    const response = await msalInstance.loginPopup({
      scopes: SCOPES,
    });
    currentToken = response.accessToken;
    console.log("[Auth] Login successful");
    return currentToken;
  } catch (err) {
    console.error("[Auth] Login failed:", err);
    return null;
  }
}

export function getToken(): string | null {
  return currentToken;
}

export function isLoggedIn(): boolean {
  return currentToken !== null;
}