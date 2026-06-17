import type { ModelProvider } from "@core/ports/model-provider.port";
import { FlowsSchema, type Flows } from "@core/domain/flows/flows.schema";
import { parseJsonLoose } from "@shared/safe-json";

export async function designFlows(provider: ModelProvider, sessionId: string, context: string, feedback?: string): Promise<Flows> {
  const res = await provider.generate({
    sessionId, component: "flows", promptVersion: "flows@v1", difficulty: "hard", json: true,
    system: "You design campaign flows: channel sequences with timing. JSON only.",
    prompt: `${context}${feedback ? `\nRevision request: ${feedback}` : ""}\n\nReturn JSON: { "flows": [{"name","audience","direction":"inbound"|"outbound","steps":[{"day":number,"channel","action"}]}] }. 1-2 flows.`,
  });
  const r = FlowsSchema.safeParse(parseJsonLoose(res.text));
  return r.success ? r.data : { flows: [{ name: "Flow", audience: "all", direction: "outbound", steps: [{ day: 1, channel: "Email", action: "send" }] }] };
}
