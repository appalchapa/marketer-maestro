import { z } from "zod";

// AI pre-send QA of one content variant. Scores are 0-100 (higher = better/safer).
// This is an AI rubric assessment, not a deliverability/inbox-rendering test.
export const QaResultSchema = z.object({
  scores: z.object({
    brand: z.coerce.number().default(0),     // brand-voice consistency
    spam: z.coerce.number().default(0),      // spam-language safety (higher = safer)
    clarity: z.coerce.number().default(0),   // message clarity
    cta: z.coerce.number().default(0),       // call-to-action strength
    subject: z.coerce.number().default(0),   // subject-line quality
  }),
  overall: z.coerce.number().default(0),
  flags: z.array(z.coerce.string()).default([]),  // specific, actionable issues
});
export type QaResult = z.infer<typeof QaResultSchema>;
