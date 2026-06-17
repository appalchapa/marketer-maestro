import type { ModelProvider } from "@core/ports/model-provider.port";
import { PlanSchema, type Plan } from "@core/domain/plan/plan.schema";
import { parseJsonLoose } from "@shared/safe-json";
import { PROMPTS, buildPrompt } from "@core/prompts/catalog";
import { newId } from "@shared/id";

// Step 8: build a project plan grounded in the approved strategy work.
// Models return deps as task NAMES; we assign stable ids and remap deps to ids.
export async function buildPlan(provider: ModelProvider, sessionId: string, context: string, feedback?: string): Promise<Plan> {
  const feedbackLine = feedback ? `\nRevision request: ${feedback}` : "";
  const res = await provider.generate({
    sessionId, component: "plan", promptVersion: PROMPTS.plan.version, difficulty: "hard", json: true,
    system: PROMPTS.plan.system,
    prompt: buildPrompt("plan", { context, feedbackLine }),
  });
  const parsed = parseJsonLoose<any>(res.text);
  const r = PlanSchema.safeParse(parsed);
  const plan: Plan = r.success ? r.data : { tasks: [{ name: "Plan unavailable; please revise", owner: "", durationDays: 1, deps: [] }] };

  // Assign stable ids, then remap any name-based deps to those ids.
  const nameToId = new Map<string, string>();
  plan.tasks.forEach((t) => { t.id = t.id || newId("task"); nameToId.set(t.name, t.id); });
  plan.tasks.forEach((t) => { t.deps = (t.deps || []).map((d) => nameToId.get(d) || d).filter((d) => plan.tasks.some((x) => x.id === d)); });
  if (!plan.startDate) plan.startDate = new Date().toISOString().slice(0, 10);
  return plan;
}
