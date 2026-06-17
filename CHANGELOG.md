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

## 1.1.0 — Observe consoles (additive; Operate core unchanged)

Adds an **Observe** mode alongside Operate (top tab bar Operate | Observe), plus a logo.
All consoles read data Operate already captures — no invented numbers.

- **Monitoring** — per-user sessions with status, cost, thumbs 👍/👎, edited count, revisions,
  expandable audit trail, and a cost-per-session chart.
- **Agents & Components** — per-component approved %, edited %, thumbs, avg revisions, avg
  latency, tokens, cost, with charts.
- **Cost & Economics** — totals, cache-hit rate, cost-by-component (donut), cost-by-model,
  and a projected-cost-at-scale calc.
- **Traces** — pick a session → step-by-step call timeline (model, cache hit, latency bar,
  tokens, cost, fallback).
- **Settings / Run-mode** — run mode, providers, timeout, prompt catalog, and an **interactive
  cache toggle** (flip it and watch cost change on the next run).

Only core change: cache enablement is now a runtime getter so the toggle works; behavior is
identical when left on. Charts are dependency-free inline SVG.

## 1.2.0 — Global observability, prompt catalog, clearer cost

- **Global view**: Observe has a "This user / All users (global)" scope toggle. Global mode
  aggregates Monitoring, Components, Cost, and Traces across everyone; Monitoring shows the
  username per session.
- **Prompt catalog (single source)**: all step prompts now live in one module
  (`src/core/prompts/catalog.ts`) that the steps and the Settings console both read — so the
  prompt shown on hover/expand is exactly what's sent. Settings shows each version; hover the
  version for the system instruction, click "view prompt" for the full system + template.
- **Cost clarity**: the Cost tab now explains cache hits (they occur only on repeated/identical
  requests; a first unique run is legitimately 0%).

## 1.2.1 — Fix: Groq fallback cost showed $0

The cost meter's pricing table lacked the Groq Llama model, so fallback calls were priced at
$0. Added llama-3.3-70b-versatile pricing ($0.59/$0.79 per 1M in/out). Fallback calls are now
costed correctly in Traces and Cost & Economics.

## 1.3.0 — Project Plan stage

Adds a **Plan** stage after Attribution (the pipeline is now 7 gated stages). The AI generates
an execution plan grounded in the approved segments/content/flows/attribution: tasks with
owner/role, duration (days), and finish-to-start dependencies. Dates compute from an editable
project start date. Editable as a table (add/edit/delete tasks, dependency checkboxes), with a
read-only Gantt timeline view that recomputes as you edit. On approval the plan is added to the
Word brief as a schedule table. Task ids are stable so dependencies survive edits.

## 1.3.1 — Plan: insert/reorder + one-level sub-tasks

- Insert a task anywhere (＋ inserts below any row), not just at the end.
- Reorder within siblings (▲▼).
- One level of hierarchy: ⤷ makes a task a sub-task of the task above; ⤴ promotes back to
  top-level. Parent "phase" rows auto-roll-up their dates from children (earliest start →
  latest end) and show duration as "auto". Dependencies may reference a parent phase.
- Gantt shades parent phases; brief indents sub-tasks under their phase.

## 1.3.2 — Fixes: attribution duplicates & plan sub-task insertion

- **Attribution**: rows now use stable keys and duplicate parameter keys (e.g. utm_campaign
  emitted more than once by the model) are merged on load, keeping the last value. No more
  repeated rows.
- **Plan**: the task array is kept in canonical display order (each parent immediately followed
  by its children), so inserts land where you expect. Added an explicit "+sub" button to add a
  sub-task directly under a top-level task; one level of nesting is enforced on both client and
  server (a sub-task of a sub-task is promoted). Insert-below and reorder now operate predictably.

## 1.4.0 — Plan-save fix, flows dropdown fix, content @-personalization

- **Plan edits now reach the brief**: removed a stage-change reset that raced with the editor
  mounting and could blank the captured plan before approve. Plan edits (incl. added tasks and
  sub-tasks) reliably save and render in the Word doc.
- **Flows audience dropdown**: now lists only your real segment names plus a placeholder; the
  stray AI-generated value no longer appears as a pre-selected option.
- **Content personalization**: type "@" in a subject or body to pick a profile attribute from
  your pasted/uploaded list; it inserts as a {{attribute}} token. Tokens carry into the brief.

## 1.4.1 — Plan parent duration + clean live status

- **Plan parent duration**: parent "phase" rows now show their rolled-up duration as a number
  (e.g. "5d (auto)") in the table, matching the Gantt. (The Gantt rollup math was already
  correct — unit-tested that a parent spans its longest/last child, not the first.)
- **Live status readability**: provider names show as "Gemini"/"Groq" (no internal wrapper
  names like "timeout(gemini)"), and provider errors are summarised to a short reason
  ("rate limit reached", "timed out", "auth/key error", "service error") instead of dumping the
  full provider error JSON. So a Gemini 429 reads: "Gemini unavailable (rate limit reached).
  Switching to Groq…".

## 1.5.0 — Serverless storage adapter (Upstash), config-selectable

- New UpstashUserStore behind the existing UserStore port, for serverless/cloud (Vercel/AWS)
  where the local filesystem isn't persistent. Sessions stored at session:{id} with index sets
  for fast per-user / global listing.
- Storage is config-selected: STORAGE=file (default, unchanged) or STORAGE=upstash with
  UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. Core untouched; file mode behaves exactly
  as before and is the safe fallback if Upstash creds are absent.
- Note: the example/flywheel store still uses files (capture-only, non-fatal on serverless);
  it will get a serverless adapter when cross-session learning is built.
