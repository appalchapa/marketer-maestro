import type { ModelProvider } from "@core/ports/model-provider.port";
import { AttributionSchema, type Attribution } from "@core/domain/attribution/attribution.schema";
import { parseJsonLoose } from "@shared/safe-json";
import { PROMPTS, buildPrompt } from "@core/prompts/catalog";

export async function buildAttribution(provider: ModelProvider, sessionId: string, context: string, feedback?: string): Promise<Attribution> {
  const feedbackLine = feedback ? `\nRevision request: ${feedback}` : "";
  const res = await provider.generate({
    sessionId, component: "attribution", promptVersion: PROMPTS.attribution.version, difficulty: "simple", json: true,
    system: PROMPTS.attribution.system,
    prompt: buildPrompt("attribution", { context, feedbackLine }),
  });
  const r = AttributionSchema.safeParse(parseJsonLoose(res.text));
  return r.success ? r.data : { params: [{ key: "utm_source", value: "maestro", purpose: "source" }] };
}
