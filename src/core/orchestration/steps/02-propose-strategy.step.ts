import type { ModelProvider } from "@core/ports/model-provider.port";
import type { GoalIntent } from "@core/domain/goal/goal.schema";
import { StrategySchema, type Strategy } from "@core/domain/strategy/strategy.schema";
import { parseJsonLoose } from "@shared/safe-json";

// Step 2: act as a Chief Marketing Strategist and propose a plan.
// `feedback` lets the human-in-the-loop gate request a revision.
export async function proposeStrategy(
  provider: ModelProvider,
  sessionId: string,
  intent: GoalIntent,
  vertical: string,
  feedback?: string,
): Promise<Strategy> {
  const revisionNote = feedback
    ? `\n\nThe marketer reviewed your previous proposal and asked for this change: "${feedback}". Revise accordingly.`
    : "";

  const res = await provider.generate({
    sessionId,
    component: "strategy",
    promptVersion: "strategy@v1",
    difficulty: "hard",
    json: true,
    system: "You are a senior Chief Marketing Strategist. Propose a focused strategy as JSON only.",
    prompt:
      `Industry: ${vertical}\nObjective: ${intent.restated} ` +
      `(KPI ${intent.kpi}, target ${intent.magnitude}, within ${intent.timeframe}).` +
      revisionNote +
      `\n\nReturn JSON: { "summary": string, "pillars": [{"title","rationale"}], "recommendedChannels": string[] }. ` +
      `Keep it to 3 pillars.`,
  });

  const parsed = parseJsonLoose(res.text);
  const result = StrategySchema.safeParse(parsed);
  if (result.success) return result.data;

  return {
    summary: "Proposed plan unavailable in structured form; please revise.",
    pillars: [{ title: "Review inputs", rationale: "The model response could not be parsed." }],
    recommendedChannels: [],
  };
}
