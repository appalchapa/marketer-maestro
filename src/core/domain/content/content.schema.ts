import { z } from "zod";
export const VariantSchema = z.object({
  id: z.string().optional(),       // stable id so flow steps can reference this variant
  tone: z.coerce.string(),
  subject: z.coerce.string().default(""),
  body: z.coerce.string().default(""),
});
export const OfferSchema = z.object({
  segment: z.coerce.string(),
  variants: z.array(VariantSchema).min(1),
});
export const ContentSchema = z.object({ offers: z.array(OfferSchema).min(1) });
export type Content = z.infer<typeof ContentSchema>;
export type Variant = z.infer<typeof VariantSchema>;
