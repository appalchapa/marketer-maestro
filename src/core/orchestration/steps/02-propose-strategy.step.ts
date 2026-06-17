import type { ModelProvider } from "@core/ports/model-provider.port";
import type { GoalIntent } from "@core/domain/goal/goal.schema";
import { StrategySchema, type Strategy } from "@core/domain/strategy/strategy.schema";
import { parseJsonLoose } from "@shared/safe-json";
import { PROMPTS, buildPrompt } from "@core/prompts/catalog";

export async function proposeStrategy(provider: ModelProvider, sessionId: string, intent: GoalIntent, vertical: string, feedback?: string): Promise<Strategy> {
  const revisionNote = feedback ? `\n\nThe marketer reviewed your previous proposal and asked for this change: "${feedback}". Revise accordingly.` : "";
  const res = await provider.generate({
    sessionId, component: "strategy", promptVersion: PROMPTS.strategy.version, difficulty: "hard", json: true,
    system: PROMPTS.strategy.system,
    prompt: buildPrompt("strategy", { vertical, restated: intent.restated, kpi: intent.kpi, magnitude: intent.magnitude, timeframe: intent.timeframe, revisionNote }),
  });
  const result = StrategySchema.safeParse(parseJsonLoose(res.text));
  if (result.success) return result.data;
  return { summary: "Proposed plan unavailable in structured form; please revise.", pillars: [{ title: "Review inputs", rationale: "The model response could not be parsed." }], recommendedChannels: [] };
}
