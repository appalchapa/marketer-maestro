import { z } from "zod";

// Coerce types: models often return numbers/booleans where we expect strings,
// which previously failed validation and dropped to a garbage fallback.
export const ConditionSchema = z.object({
  attribute: z.coerce.string(),
  operator: z.coerce.string().default("="),
  value: z.coerce.string().default(""),
});

export const SegmentSchema = z.object({
  name: z.coerce.string().default("Segment"),
  description: z.coerce.string().default(""),
  match: z.preprocess(
    (v) => String(v ?? "AND").toUpperCase().trim(),
    z.enum(["AND", "OR"]).catch("AND"),
  ),
  conditions: z.array(ConditionSchema).min(1),
});

export const SegmentsSchema = z.object({
  segments: z.array(SegmentSchema).min(1),
});
export type Segments = z.infer<typeof SegmentsSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
