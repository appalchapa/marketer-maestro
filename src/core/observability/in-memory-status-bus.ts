import type { StatusBus, StatusEvent } from "./status-bus.port";
export class InMemoryStatusBus implements StatusBus {
  private handlers = new Set<(e: StatusEvent) => void>();
  publish(e: StatusEvent) { for (const h of this.handlers) h(e); }
  subscribe(handler: (e: StatusEvent) => void) { this.handlers.add(handler); return () => this.handlers.delete(handler); }
}
