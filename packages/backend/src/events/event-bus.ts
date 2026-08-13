// ============================================================
// MOMTV Backend - Event Bus (In-Memory + Redis)
// ============================================================
// Lightweight pub/sub event system for inter-component communication.
// Uses in-memory EventEmitter with optional Redis for multi-process.
// ============================================================

import { EventEmitter } from "events";
import type { StudioEvent, StudioEventType } from "@momtv/shared";

export type EventHandler<T = unknown> = (data: T) => void;

export class EventBus {
  private emitter = new EventEmitter();
  private eventHistory: StudioEvent[] = [];
  private maxHistory = 100;

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  // --- Publish ---

  emit(eventType: StudioEventType, data: StudioEvent): void {
    this.eventHistory.push(data);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory);
    }
    this.emitter.emit(eventType, data);
  }

  // --- Subscribe ---

  on<T = unknown>(eventType: StudioEventType, handler: EventHandler<T>): () => void {
    this.emitter.on(eventType, handler as EventHandler);
    return () => this.emitter.off(eventType, handler as EventHandler);
  }

  once<T = unknown>(eventType: StudioEventType, handler: EventHandler<T>): void {
    this.emitter.once(eventType, handler as EventHandler);
  }

  // --- History ---

  getRecentEvents(count: number = 20): StudioEvent[] {
    return this.eventHistory.slice(-count);
  }

  // --- Cleanup ---

  removeAllListeners(eventType?: StudioEventType): void {
    if (eventType) {
      this.emitter.removeAllListeners(eventType);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}

// Singleton instance
export const eventBus = new EventBus();