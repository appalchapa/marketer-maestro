# Marketer Maestro

> **Operate 1.0 — stable baseline.** See CHANGELOG.md. Future work is additive; the Operate core is frozen.

An AI marketing strategist you co-create with — plus a glass-box console for cost,
quality and traces. This repository is a capability showcase: it demonstrates a
production-shaped AI architecture (ports & adapters, an optimization decorator
pipeline, an event bus feeding observability) using only free-tier tools.

> **Status:** Pipeline reordered to Strategy -> Signals -> Segments -> Content -> Flows ->
> Attribution, so flow steps can reference real content. Message steps (Email/SMS/Push/In-app/
> WhatsApp) can run an A/B content test: pick variants from the step's audience segment and set
> a percentage split enforced to total 100%. The Word brief resolves each A/B entry to its
> content. All stages remain freely editable. Next: Observe consoles.

## Quick start

Requires Node.js 20+ (get it from https://nodejs.org — the "LTS" installer).
After installing Node, open a NEW terminal window, then:

```bash
npm install        # downloads dependencies (ignore the "vulnerabilities" notice — it's normal)
npm run dev        # starts the app at http://localhost:3000
```

Open http://localhost:3000 and click "Run pipeline demo". You'll see the second
identical request come back as a cache hit with zero cost — the optimization
pipeline working.

Prefer a headless check? Run `npm run demo:pipeline` — it prints the same proof
in your terminal without the browser.

No API key needed: it runs on a built-in mock provider out of the box. To use the
real model, copy `.env.example` to `.env.local` and paste a free Gemini key from
https://aistudio.google.com (no credit card).

> Windows note: extract the zip fully (right-click → "Extract All…") before running —
> don't run from inside the zip preview. Run the commands from the folder that
> directly contains `package.json`.


## What you can do right now

1. Enter a **username** (sessions are saved under it and survive restarts).
2. Enter an **industry**, a **goal**, and your **customer attribute names** —
   paste them, or upload a CSV/Excel (only the header row is read; real data never leaves
   your machine). MCP attribute pull is the next build. Then **Start strategy session**.
   The Signals and Segments stages are constrained to ONLY use the attributes you provided
   (an Attribute Checker hook drops anything the model invents).
3. Move through six gated stages — **Strategy, Signals, Segments, Flows, Content, Attribution** —
   approving or revising each one before the next is generated (human-in-the-loop at every step).
4. A progress rail shows where you are; a live cost ticker shows spend per session.
5. When all stages are approved, **download a formatted Word brief** of the whole strategy.
6. The **Live status** panel (right side) streams what's happening: contacting the model,
   falling back to the backup provider if the primary is down, the model that answered, or a
   clear error with a retry button.
7. The **Monitoring** list shows every past session for that user, with status and cost.

### See the fallback in action
Set `MAESTRO_SIMULATE_GEMINI_FAIL=true` in `.env.local` and restart. The status panel will show
Gemini failing and the automatic fallback to Groq — a live demo of the reliability layer.

Runs on a built-in mock model with no key. Add a free Gemini key (below) for real output.

## Why the architecture looks like this

**Ports & adapters (hexagonal).** `src/core` knows nothing about Next.js, Gemini or
AWS — only interfaces (`ports`). Implementations live in `src/adapters` and are wired
in exactly one place: `src/composition/container.ts`. Dependencies point inward only.

**Optimization is a decorator chain, not logic inside features.** Caching, cost-metering
(and later routing, fallback) each implement the same `ModelProvider` interface, add one
behavior, and delegate inward:

```
caller → CostMeter → SemanticCache → (Router → Fallback) → Gemini | Groq | Bedrock
```

The eight orchestration steps and the UI never know optimization exists — they just call
`modelProvider.generate()`. Adding a new optimization later is a new wrapper, zero changes
elsewhere.

**Wrappers emit events; consumers subscribe.** Every model call publishes a
`ModelCallEvent` to an event bus. The same event feeds the cost dashboard, the traces view
and the per-user monitoring tab — without the wrappers knowing any tab exists.

**One codebase, three run modes via config.** `MAESTRO_MODE=local|live|bedrock` selects
which leaf provider the composition root instantiates. Nothing in `core` or the UI changes.

## Layout

```
config/                 run mode + toggles (the only place env is read for wiring)
src/
  core/
    ports/              interfaces — model-provider.port.ts
    observability/      event bus + the ModelCallEvent contract
  adapters/
    model/providers/    leaf providers: mock (no key), gemini (real)
    model/pipeline/     the decorator chain: cost-meter, cache, router, fallback, composer
  composition/          container.ts — wires adapters per mode (start reading here)
  shared/               dependency-free helpers
  app/                  thin Next.js edge: a demo route + page
scripts/                demo-pipeline.ts — headless end-to-end proof
docs/decisions/         architecture decision records
```

## What to read first

1. `src/core/ports/model-provider.port.ts` — the one interface everything shares.
2. `src/adapters/model/pipeline/compose-pipeline.ts` — how the decorator chain is built.
3. `src/composition/container.ts` — how config picks adapters for each run mode.
4. `scripts/demo-pipeline.ts` — see it all run.

## Roadmap

- Orchestration steps (intent → strategy → segments → flows → content → brief) with HITL gates
- `user-store` port for per-user history/audit/memory across sessions
- Observe consoles: components, monitoring, traces, evals, cost, knowledge base, settings
- Router + fallback wrappers activated in live mode
- RAG (vector store + re-ranker), guardrails (PII + injection), evals (Promptfoo + LLM-judge)
- MCP attribute source; phase-2 MCP execution agents
