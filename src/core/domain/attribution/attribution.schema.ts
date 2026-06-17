import { z } from "zod";
export const ParamSchema = z.object({
  key: z.string(),       // utm_source
  value: z.string(),     // maestro
  purpose: z.string(),
});
// Step 7: URL tracking parameters for attribution.
export const AttributionSchema = z.object({ params: z.array(ParamSchema).min(1) });
export type Attribution = z.infer<typeof AttributionSchema>;
