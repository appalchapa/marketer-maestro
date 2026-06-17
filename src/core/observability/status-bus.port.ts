// Live status updates streamed to the UI while a stage runs.
export type StatusKind = "info" | "retry" | "fallback" | "timeout" | "error";
export interface StatusEvent {
  sessionId: string;
  kind: StatusKind;
  message: string;
  at: number;
}
export interface StatusBus {
  publish(e: StatusEvent): void;
  subscribe(handler: (e: StatusEvent) => void): () => void;
}
