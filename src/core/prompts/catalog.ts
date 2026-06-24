// The prompt catalog: ONE place that holds every step's system instruction and
// user-prompt template. Steps build their prompts from here, and the Settings
// console displays them — so what you see on hover is exactly what's sent.
export interface PromptEntry { version: string; system: string; template: string; }

export const PROMPTS: Record<string, PromptEntry> = {
  intent: {
    version: "intent@v1",
    system: "You convert a marketer's goal into a compact JSON target. Reply with ONLY JSON.",
    template:
      'Industry: {vertical}\nGoal: "{goalText}"\n\n' +
      'Return JSON with keys: goalType, kpi, magnitude, timeframe, focus, restated. ' +
      '"restated" is a one-line plain-English restatement.',
  },
  strategy: {
    version: "strategy@v1",
    system: "You are a senior Chief Marketing Strategist. Propose a focused strategy as JSON only.",
    template:
      'Industry: {vertical}\nObjective: {restated} (KPI {kpi}, target {magnitude}, within {timeframe}).{revisionNote}' +
      '\n\nReturn JSON: { "summary": string, "pillars": [{"title","rationale"}], "recommendedChannels": string[] }. Keep it to 3 pillars.',
  },
  signals: {
    version: "signals@v1",
    system: "You identify which customer data signals matter for a marketing goal. JSON only.",
    template:
      '{context}{attrLine}{feedbackLine}\n\n' +
      'Return JSON: { "signals": [{"name","rationale"}] }. 3-5 signals{attrConstraint}.',
  },
  segments: {
    version: "segments@v1",
    system: "You build audience segments as AND/OR condition groups. JSON only.",
    template:
      '{context}{attrLine}{feedbackLine}\n\n' +
      'Return JSON: { "segments": [{"name","description","match":"AND"|"OR","conditions":[{"attribute","operator","value"}]}] }. 2-3 segments{attrConstraint}.',
  },
  content: {
    version: "content@v1",
    system: "You write marketing offers with A/B tone variations. JSON only.",
    template:
      '{context}{feedbackLine}\n\n' +
      'Return JSON: { "offers": [{"segment","variants":[{"tone","subject","body"}]}] }. Two variants (different tones) per offer.',
  },
  flows: {
    version: "flows@v1",
    system: "You design campaign flows: channel sequences with timing. JSON only.",
    template:
      '{context}{feedbackLine}\n\n' +
      'Return JSON: { "flows": [{"name","audience","direction":"inbound"|"outbound","steps":[{"day":number,"channel","action"}]}] }. 1-2 flows.',
  },
  plan: {
    version: "plan@v1",
    system: "You create a marketing execution project plan as JSON only.",
    template:
      '{context}{feedbackLine}\n\n' +
      'Return JSON: { "tasks": [{"name","owner","durationDays":number,"deps":[task names that must finish first]}] }. ' +
      '6-9 tasks covering implementing segments, writing/approving content, building flows, configuring attribution, QA, and launch. ' +
      'Use realistic owners (e.g. Marketing Ops, Content, Analytics, QA) and durations in days.',
  },
  variant: {
    version: "variant@v1",
    system: "You write a single marketing message variant in a specified tone. JSON only.",
    template:
      'Segment: {segment}\nTone: {tone}\nContext: {context}{hint}\n\n' +
      'Write ONE message in this tone. Return JSON: { "subject": string, "body": string, "ctaText": string }. ' +
      'Keep subject under 60 chars, body 1-3 sentences, ctaText 2-4 words.',
  },
  attribution: {
    version: "attribution@v1",
    system: "You define URL tracking parameters for campaign attribution. JSON only.",
    template:
      '{context}{feedbackLine}\n\n' +
      'Return JSON: { "params": [{"key","value","purpose"}] }. Standard UTM params.',
  },
};

// Fill {placeholders} in a template. Missing keys become empty strings.
export function buildPrompt(component: string, vars: Record<string, string>): string {
  const t = PROMPTS[component]?.template ?? "";
  return t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
