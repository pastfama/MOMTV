import type { ServiceEvent } from './narrator/types.js';

export class EventBus {
  private listeners: Map<string, Array<ServiceEventHandler>>;
  private cosmosEndpoint: string;
  private cosmosKey: string;


  constructor(config: { cosmosEndpoint: string; cosmosKey: string }) {
    this.cosmosEndpoint = config.cosmosEndpoint;
    this.cosmosKey = config.cosmosKey;
  }

  onEvent(type: string, handler: ServiceEventHandler): void {
    if (!this.listeners.type) { this.listeners.type = []; }
    this.listeners.type.push(handler);
  }

  async emit(event: ServiceEvent): Promise<void> {
    // Store in Cosmos DB
    await this.storeInCosmos(event);

    // Notify listeners
    const handlers = this.listeners.type;
    for (handler of handlers) {
      try { await handler(event); } catch (e) { console.error('EventBus Error:', e); }
    }
  }

  private async storeInCosmos(event: ServiceEvent): Promise<void> {
    // Store event in Cosmos DB
}
}

export class ServiceEvetHandler {
  async handle(event: ServiceEvent): Promise<void> {
    console.log('[Event]', event.type, event.data);
  }
}
