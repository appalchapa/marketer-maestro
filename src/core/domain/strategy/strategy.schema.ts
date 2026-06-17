import { z } from "zod";

// The proposed strategy (step 2). The marketer approves or revises this
// before anything else is generated — the human-in-the-loop gate.
export const StrategySchema = z.object({
  summary: z.string(),
  pillars: z.array(z.object({
    title: z.string(),
    rationale: z.string(),
  })).min(1),
  recommendedChannels: z.array(z.string()),
});

export type Strategy = z.infer<typeof StrategySchema>;
