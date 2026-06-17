# Changelog

## Operate 1.0 (1.0.0) — stable baseline

The first stable milestone: the complete **Operate** experience — a marketer co-creates a
full marketing strategy with the Maestro, one human-approved stage at a time, and exports a
formatted Word brief. This version is treated as a frozen baseline; future work is additive.

### What Operate 1.0 includes

**Pipeline (human-gated, in order)**
- Understand goal → Strategy → Signals → Segments → Content → Flows → Attribution → Word brief.
- Every stage is approve-or-revise gated; the marketer's edits are the source of truth.

**Inputs**
- Goal (free text), industry, and customer attribute *names* via paste or CSV/Excel upload
  (header row only — real customer data never leaves the machine). MCP attribute pull is planned.

**Editable stages (AI proposes, you edit freely)**
- Segments: drag attributes (or click-add) into AND/OR condition groups; edit operator/value.
- Content: edit A/B tone variants; add/remove variants and offers; each variant has a stable id.
- Flows: drag (or ▲▼) to reorder steps; edit channel/day/action; audience picks a segment.
- Flows A/B: message steps (Email/SMS/Push/In-app/WhatsApp) can split traffic across content
  variants from the step's audience segment; the split is enforced to total 100%.
- Attribution: edit/add/delete tracking parameters.
- Word brief resolves each flow A/B entry to its content.

**Reliability & observability**
- Every model call flows through timeout → retry → fallback (Gemini primary, Groq fallback).
- Live status streamed to the UI (contacting provider, fallback, answered, or clear error —
  never an endless spinner; 60s client watchdog).
- Per-component efficacy signal captured (thumbs + whether the draft was edited + revisions),
  shown against tokens/cost.

**Architecture**
- Ports & adapters (hexagonal); optimization as a decorator pipeline around the model port;
  event + status buses feeding observability; one composition root; three run modes via config.
- Per-user persistence across sessions; every approval captured as a learning example
  (foundation for cross-session learning).

### Known boundaries (intended for later, additive work)
- Observe consoles (Traces, Monitoring, Components, Evals, Cost, Knowledge Base, Settings).
- Tier-1 cross-session learning (retrieve approved examples into prompts).
- MCP attribute source and phase-2 MCP execution agents.

### Notes
- Runs with no API key on a built-in mock model; add a free Gemini key (and optional Groq key)
  in `.env.local` for live generation.
- Drag gestures are complemented by reliable fallbacks (click-add for segments, ▲▼ for flows).
