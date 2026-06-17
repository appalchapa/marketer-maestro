import type { ModelProvider } from "@core/ports/model-provider.port";
import { AttributionSchema, type Attribution } from "@core/domain/attribution/attribution.schema";
import { parseJsonLoose } from "@shared/safe-json";

export async function buildAttribution(provider: ModelProvider, sessionId: string, context: string, feedback?: string): Promise<Attribution> {
  const res = await provider.generate({
    sessionId, component: "attribution", promptVersion: "attribution@v1", difficulty: "simple", json: true,
    system: "You define URL tracking parameters for campaign attribution. JSON only.",
    prompt: `${context}${feedback ? `\nRevision request: ${feedback}` : ""}\n\nReturn JSON: { "params": [{"key","value","purpose"}] }. Standard UTM params.`,
  });
  const r = AttributionSchema.safeParse(parseJsonLoose(res.text));
  return r.success ? r.data : { params: [{ key: "utm_source", value: "maestro", purpose: "source" }] };
}
