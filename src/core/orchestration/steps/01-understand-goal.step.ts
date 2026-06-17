import type { ModelProvider } from "@core/ports/model-provider.port";
import { GoalIntentSchema, type GoalIntent } from "@core/domain/goal/goal.schema";
import { parseJsonLoose } from "@shared/safe-json";

// Step 1: turn the free-text goal into a structured, validated target.
// Uses a TIGHT json prompt — fast and cheap, unlike a free-form generation.
export async function understandGoal(
  provider: ModelProvider,
  sessionId: string,
  goalText: string,
  vertical: string,
): Promise<GoalIntent> {
  const res = await provider.generate({
    sessionId,
    component: "intent",
    promptVersion: "intent@v1",
    difficulty: "simple",
    json: true,
    system: "You convert a marketer's goal into a compact JSON target. Reply with ONLY JSON.",
    prompt:
      `Industry: ${vertical}\nGoal: "${goalText}"\n\n` +
      `Return JSON with keys: goalType, kpi, magnitude, timeframe, focus, restated. ` +
      `"restated" is a one-line plain-English restatement.`,
  });

  const parsed = parseJsonLoose(res.text);
  const result = GoalIntentSchema.safeParse(parsed);
  if (result.success) return result.data;

  // Graceful fallback so the flow never hard-fails on a malformed response.
  return {
    goalType: goalText, kpi: "unspecified", magnitude: "unspecified",
    timeframe: "unspecified", focus: "unspecified",
    restated: goalText,
  };
}
