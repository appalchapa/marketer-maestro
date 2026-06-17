import { z } from "zod";

export const TaskSchema = z.object({
  id: z.string().optional(),
  name: z.coerce.string(),
  owner: z.coerce.string().default(""),
  durationDays: z.coerce.number().default(1),
  deps: z.array(z.string()).default([]),
  parentId: z.string().optional(),   // one level: a child points to a top-level task
});

export const PlanSchema = z.object({
  startDate: z.string().optional(),
  tasks: z.array(TaskSchema).min(1),
});

export type Plan = z.infer<typeof PlanSchema>;
export type Task = z.infer<typeof TaskSchema>;
