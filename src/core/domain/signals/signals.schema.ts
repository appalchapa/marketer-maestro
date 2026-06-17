import { z } from "zod";
// Step 3: which behavioural signals/attributes matter for this goal.
export const SignalsSchema = z.object({
  signals: z.array(z.object({
    name: z.string(),       // e.g. "last_login_days"
    rationale: z.string(),  // why it matters for the goal
  })).min(1),
});
export type Signals = z.infer<typeof SignalsSchema>;
