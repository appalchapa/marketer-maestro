import { z } from "zod";

// The structured target produced from the marketer's free-text goal (step 1).
// Keeping this as a schema means the model's output is validated, not trusted.
export const GoalIntentSchema = z.object({
  goalType: z.string(),        // e.g. "reduce churn", "increase upsell"
  kpi: z.string(),             // the metric, e.g. "churn rate"
  magnitude: z.string(),       // e.g. "10%"
  timeframe: z.string(),       // e.g. "2 months"
  focus: z.string(),           // "retention" | "acquisition" | "upsell" | ...
  restated: z.string(),        // a one-line plain restatement, for the UI
});

export type GoalIntent = z.infer<typeof GoalIntentSchema>;
