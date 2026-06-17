# ADR 0001 — Optimization as a decorator pipeline around the model port

## Status
Accepted.

## Context
Caching, cost-metering, model routing and provider fallback are cross-cutting concerns:
they apply to every model call made by every orchestration step. They could live inside
each step, or in a shared wrapper.

## Decision
Each optimization is a separate object implementing the same `ModelProvider` interface,
composed as a chain (decorator pattern). The composition root assembles the chain from
config; features depend only on the `ModelProvider` interface.

Order (outer → inner): cost-meter → semantic cache → router → fallback → leaf provider.
Cost-meter is outermost so it measures true end-to-end latency and correctly records
cache hits as zero-cost.

## Consequences
- Adding an optimization is a new wrapper file + one composition line. No feature changes.
- Each wrapper is unit-testable in isolation with a fake inner provider.
- Toggling caching off (for a demo) is a config flag — the chain is rebuilt without it.
- Steps and UI never reference optimization; they call `generate()` and stay oblivious.
- Slight indirection cost when reading a single call's path — mitigated by this ADR and
  the explicit order documented in `compose-pipeline.ts`.

## Alternatives considered
- Optimization logic inside each step: rejected — duplicated across 8+ steps, every test
  must mock it, and turning caching off means editing every step.
- A single monolithic "smart client": rejected — mixes four concerns in one class, hard
  to test or extend.
