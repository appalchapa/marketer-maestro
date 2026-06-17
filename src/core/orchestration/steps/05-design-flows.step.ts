import type { ModelProvider } from "@core/ports/model-provider.port";
import { FlowsSchema, type Flows } from "@core/domain/flows/flows.schema";
import { parseJsonLoose } from "@shared/safe-json";
import { PROMPTS, buildPrompt } from "@core/prompts/catalog";

export async function designFlows(provider: ModelProvider, sessionId: string, context: string, feedback?: string): Promise<Flows> {
  const feedbackLine = feedback ? `\nRevision request: ${feedback}` : "";
  const res = await provider.generate({
    sessionId, component: "flows", promptVersion: PROMPTS.flows.version, difficulty: "hard", json: true,
    system: PROMPTS.flows.system,
    prompt: buildPrompt("flows", { context, feedbackLine }),
  });
  const r = FlowsSchema.safeParse(parseJsonLoose(res.text));
  return r.success ? r.data : { flows: [{ name: "Flow", audience: "all", direction: "outbound", steps: [{ day: 1, channel: "Email", action: "send" }] }] };
}
