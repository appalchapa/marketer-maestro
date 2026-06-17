import type { ModelProvider } from "@core/ports/model-provider.port";
import { ContentSchema, type Content } from "@core/domain/content/content.schema";
import { parseJsonLoose } from "@shared/safe-json";

export async function generateContent(provider: ModelProvider, sessionId: string, context: string, feedback?: string): Promise<Content> {
  const res = await provider.generate({
    sessionId, component: "content", promptVersion: "content@v1", difficulty: "hard", json: true,
    system: "You write marketing offers with A/B tone variations. JSON only.",
    prompt: `${context}${feedback ? `\nRevision request: ${feedback}` : ""}\n\nReturn JSON: { "offers": [{"segment","variants":[{"tone","subject","body"}]}] }. Two variants (different tones) per offer.`,
  });
  const r = ContentSchema.safeParse(parseJsonLoose(res.text));
  return r.success ? r.data : { offers: [{ segment: "Segment", variants: [{ tone: "warm", subject: "Hello", body: "fallback" }] }] };
}
