import { z } from "zod";
export const AbEntrySchema = z.object({
  variantId: z.string(),
  percent: z.coerce.number(),
});
export const FlowStepSchema = z.object({
  day: z.coerce.number().default(1),
  channel: z.coerce.string(),
  action: z.coerce.string().default(""),
  abTest: z.array(AbEntrySchema).optional(),   // only meaningful for message channels
});
export const FlowSchema = z.object({
  name: z.coerce.string(),
  audience: z.coerce.string().default(""),
  direction: z.preprocess((v) => String(v ?? "outbound").toLowerCase().trim(), z.enum(["inbound", "outbound"]).catch("outbound")),
  steps: z.array(FlowStepSchema).min(1),
});
export const FlowsSchema = z.object({ flows: z.array(FlowSchema).min(1) });
export type Flows = z.infer<typeof FlowsSchema>;
export type Flow = z.infer<typeof FlowSchema>;
export type FlowStep = z.infer<typeof FlowStepSchema>;

// Channels that send templated content (so A/B content selection applies).
export const MESSAGE_CHANNELS = ["Email", "SMS", "Push", "In-app", "WhatsApp"];
export const isMessageChannel = (c: string) => MESSAGE_CHANNELS.includes(c);
