// Ordered, human-gated stages (after intent). Content now precedes Flows so flow
// steps can reference real, approved content variants (incl. A/B splits).
export const STAGES = [
  { key: "strategy",    label: "Strategy",    step: 2 },
  { key: "signals",     label: "Signals",     step: 3 },
  { key: "segments",    label: "Segments",    step: 4 },
  { key: "content",     label: "Content",     step: 5 },
  { key: "flows",       label: "Flows",       step: 6 },
  { key: "attribution", label: "Attribution", step: 7 },
  { key: "plan",        label: "Plan",        step: 8 },
] as const;
export type StageKey = (typeof STAGES)[number]["key"];
