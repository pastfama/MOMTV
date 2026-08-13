// ============================================================
// MOMTV Studio - WebSocket Client
// ============================================================
// Connects to the backend WebSocket server to receive
// real-time studio events (agent speech, scene changes, etc.)
// ============================================================

import type { StudioEvent, StudioEventType } from "@momtv/shared";

export type WSMessageHandler = (event: StudioEvent) => void;

export class StudioWSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<StudioEventType, WSMessageHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;

  constructor(url?: string) {
    // Auto-detect WebSocket URL from current page
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.url = url ?? `${protocol}//${window.location.host}/ws`;
  }

  connect(): void {
    console.log(`[WS] Connecting to ${this.url}...`);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log("[WS] Connected");
        this.updateConnectionUI(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const studioEvent = JSON.parse(event.data) as StudioEvent;
          this.dispatchEvent(studioEvent);
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.log("[WS] Disconnected, reconnecting in 3s...");
        this.updateConnectionUI(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error("[WS] Error:", err);
      };
    } catch (err) {
      console.error("[WS] Connection failed:", err);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
  }

  on(eventType: StudioEventType, handler: WSMessageHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);

    return () => {
      const list = this.handlers.get(eventType);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx >= 0) list.splice(idx, 1);
      }
    };
  }

  send(type: string, data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }

  // --- Internal ---

  private dispatchEvent(event: StudioEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (err) {
          console.error(`[WS] Handler error for ${event.type}:`, err);
        }
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private updateConnectionUI(connected: boolean): void {
    const el = document.getElementById("connection-status");
    if (el) {
      el.className = connected ? "connected" : "disconnected";
      el.textContent = connected ? "⚡ Connected" : "⚡ Reconnecting...";
    }
  }
}