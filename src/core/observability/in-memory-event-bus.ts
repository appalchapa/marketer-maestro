import type { EventBus } from "./event-bus.port";
import type { ModelCallEvent } from "./optimization-event.types";

// A minimal synchronous event bus. Good enough for local mode and the demo.
// In live mode you would swap this for one that also forwards to Langfuse,
// without changing a single publisher — that is the point of the port.
export class InMemoryEventBus implements EventBus {
  private handlers = new Set<(e: ModelCallEvent) => void>();

  publish(event: ModelCallEvent): void {
    for (const h of this.handlers) h(event);
  }

  subscribe(handler: (event: ModelCallEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
