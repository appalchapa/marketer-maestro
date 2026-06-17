import type { ModelProvider } from "@core/ports/model-provider.port";
import { SignalsSchema, type Signals } from "@core/domain/signals/signals.schema";
import { parseJsonLoose } from "@shared/safe-json";
import { PROMPTS, buildPrompt } from "@core/prompts/catalog";

export async function mapSignals(provider: ModelProvider, sessionId: string, context: string, attributes: string[], feedback?: string): Promise<Signals> {
  const attrLine = attributes.length ? `\nAvailable attributes (use ONLY these): ${attributes.join(", ")}` : "";
  const feedbackLine = feedback ? `\nRevision request: ${feedback}` : "";
  const attrConstraint = attributes.length ? ", chosen ONLY from the available attributes above" : "";
  const res = await provider.generate({
    sessionId, component: "signals", promptVersion: PROMPTS.signals.version, difficulty: "simple", json: true,
    system: PROMPTS.signals.system,
    prompt: buildPrompt("signals", { context, attrLine, feedbackLine, attrConstraint }),
  });
  const r = SignalsSchema.safeParse(parseJsonLoose(res.text));
  return r.success ? r.data : { signals: [{ name: attributes[0] ?? "engagement", rationale: "fallback" }] };
}
