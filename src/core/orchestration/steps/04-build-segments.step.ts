import type { ModelProvider } from "@core/ports/model-provider.port";
import { SegmentsSchema, type Segments } from "@core/domain/segments/segments.schema";
import { parseJsonLoose } from "@shared/safe-json";

export async function buildSegments(provider: ModelProvider, sessionId: string, context: string, attributes: string[], feedback?: string): Promise<Segments> {
  const attrLine = attributes.length ? `\nAvailable attributes (use ONLY these): ${attributes.join(", ")}` : "";
  const res = await provider.generate({
    sessionId, component: "segments", promptVersion: "segments@v1", difficulty: "hard", json: true,
    system: "You build audience segments as AND/OR condition groups. JSON only.",
    prompt: `${context}${attrLine}${feedback ? `\nRevision request: ${feedback}` : ""}\n\nReturn JSON: { "segments": [{"name","description","match":"AND"|"OR","conditions":[{"attribute","operator","value"}]}] }. 2-3 segments${attributes.length ? ". Every condition's attribute MUST be one of the available attributes above" : ""}.`,
  });
  const r = SegmentsSchema.safeParse(parseJsonLoose(res.text));
  return r.success ? r.data : { segments: [{ name: "Segment", description: "fallback", match: "AND", conditions: [{ attribute: attributes[0] ?? "x", operator: "=", value: "y" }] }] };
}
