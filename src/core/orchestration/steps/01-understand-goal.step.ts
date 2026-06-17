import type { ModelProvider } from "@core/ports/model-provider.port";
import { GoalIntentSchema, type GoalIntent } from "@core/domain/goal/goal.schema";
import { parseJsonLoose } from "@shared/safe-json";
import { PROMPTS, buildPrompt } from "@core/prompts/catalog";

// Step 1: turn the free-text goal into a structured, validated target.
export async function understandGoal(provider: ModelProvider, sessionId: string, goalText: string, vertical: string): Promise<GoalIntent> {
  const res = await provider.generate({
    sessionId, component: "intent", promptVersion: PROMPTS.intent.version, difficulty: "simple", json: true,
    system: PROMPTS.intent.system,
    prompt: buildPrompt("intent", { vertical, goalText }),
  });
  const result = GoalIntentSchema.safeParse(parseJsonLoose(res.text));
  if (result.success) return result.data;
  return { goalType: goalText, kpi: "unspecified", magnitude: "unspecified", timeframe: "unspecified", focus: "unspecified", restated: goalText };
}
