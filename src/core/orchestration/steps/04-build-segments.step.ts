import type { ModelProvider } from "@core/ports/model-provider.port";
import { SegmentsSchema, type Segments } from "@core/domain/segments/segments.schema";
import { parseJsonLoose } from "@shared/safe-json";
import { PROMPTS, buildPrompt } from "@core/prompts/catalog";

export async function buildSegments(provider: ModelProvider, sessionId: string, context: string, attributes: string[], feedback?: string): Promise<Segments> {
  const attrLine = attributes.length ? `\nAvailable attributes (use ONLY these): ${attributes.join(", ")}` : "";
  const feedbackLine = feedback ? `\nRevision request: ${feedback}` : "";
  const attrConstraint = attributes.length ? ". Every condition's attribute MUST be one of the available attributes above" : "";
  const res = await provider.generate({
    sessionId, component: "segments", promptVersion: PROMPTS.segments.version, difficulty: "hard", json: true,
    system: PROMPTS.segments.system,
    prompt: buildPrompt("segments", { context, attrLine, feedbackLine, attrConstraint }),
  });
  const r = SegmentsSchema.safeParse(parseJsonLoose(res.text));
  return r.success ? r.data : { segments: [{ name: "Segment", description: "fallback", match: "AND", conditions: [{ attribute: attributes[0] ?? "x", operator: "=", value: "y" }] }] };
}
