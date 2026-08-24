import type { ServiceEvent } from '../narrator/types.js';

export type ServiceEventHandler = (event: ServiceEvent) => Promise<void>;

export class EventBus {
  private listeners: Map<string, Array<ServiceEventHandler>> = new Map();

  onEvent(type: string, handler: ServiceEventHandler): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(handler);
  }

  async emit(event: ServiceEvent): Promise<void> {
    console.log('[EventBus] Emitting:', event.type, event.data);
    const handlers = this.listeners.get(event.type) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (e) {
        console.error('[EventBus] Handler error:', e);
      }
    }
  }
}
