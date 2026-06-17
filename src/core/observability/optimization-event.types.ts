// The structured event every optimization wrapper emits.
// Consumers (telemetry, cost dashboard, traces, per-user store) read these.
export interface ModelCallEvent {
  readonly id: string;
  readonly timestamp: number;
  readonly sessionId: string;
  readonly component: string;      // which step/agent made the call, e.g. "intent"
  readonly model: string;          // which model actually answered
  readonly promptVersion?: string; // which catalogued prompt fired
  readonly cacheHit: boolean;      // served from semantic cache?
  readonly routedReason?: string;  // why the router picked this model
  readonly fellBackFrom?: string;  // set if a provider failed and we failed over
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly costUsd: number;        // estimated dollar cost for this call
  readonly latencyMs: number;
}
