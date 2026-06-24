import { z } from "zod";

// Result of analyzing a pasted/uploaded campaign brief (transient — the brief itself is never stored).
// Mirrors the goal intent, plus clarifying questions and proactive suggestions for a human-in-the-loop intake.
export const BriefAnalysisSchema = z.object({
  goalText: z.coerce.string().default(""),     // a concise goal extracted from the brief
  vertical: z.coerce.string().default("General"),
  attributes: z.array(z.coerce.string()).default([]),  // audience/personalization signals inferred
  questions: z.array(z.coerce.string()).default([]),   // clarifying questions where the brief is vague
  suggestions: z.array(z.coerce.string()).default([]), // proactive recommendations from reading the brief
});
export type BriefAnalysis = z.infer<typeof BriefAnalysisSchema>;
