import type { ModelProvider } from "@core/ports/model-provider.port";
import { SignalsSchema, type Signals } from "@core/domain/signals/signals.schema";
import { parseJsonLoose } from "@shared/safe-json";

export async function mapSignals(provider: ModelProvider, sessionId: string, context: string, attributes: string[], feedback?: string): Promise<Signals> {
  const attrLine = attributes.length ? `\nAvailable attributes (use ONLY these): ${attributes.join(", ")}` : "";
  const res = await provider.generate({
    sessionId, component: "signals", promptVersion: "signals@v1", difficulty: "simple", json: true,
    system: "You identify which customer data signals matter for a marketing goal. JSON only.",
    prompt: `${context}${attrLine}${feedback ? `\nRevision request: ${feedback}` : ""}\n\nReturn JSON: { "signals": [{"name","rationale"}] }. 3-5 signals${attributes.length ? ", chosen ONLY from the available attributes above" : ""}.`,
  });
  const r = SignalsSchema.safeParse(parseJsonLoose(res.text));
  return r.success ? r.data : { signals: [{ name: attributes[0] ?? "engagement", rationale: "fallback" }] };
}
