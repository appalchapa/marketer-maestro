import type { ModelCallEvent } from "./optimization-event.types";

// The interface. Publishers depend on this, never on a concrete consumer.
export interface EventBus {
  publish(event: ModelCallEvent): void;
  subscribe(handler: (event: ModelCallEvent) => void): () => void; // returns unsubscribe
}
