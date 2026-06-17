import type { ModelProvider } from "@core/ports/model-provider.port";
import { ContentSchema, type Content } from "@core/domain/content/content.schema";
import { parseJsonLoose } from "@shared/safe-json";
import { PROMPTS, buildPrompt } from "@core/prompts/catalog";

export async function generateContent(provider: ModelProvider, sessionId: string, context: string, feedback?: string): Promise<Content> {
  const feedbackLine = feedback ? `\nRevision request: ${feedback}` : "";
  const res = await provider.generate({
    sessionId, component: "content", promptVersion: PROMPTS.content.version, difficulty: "hard", json: true,
    system: PROMPTS.content.system,
    prompt: buildPrompt("content", { context, feedbackLine }),
  });
  const r = ContentSchema.safeParse(parseJsonLoose(res.text));
  return r.success ? r.data : { offers: [{ segment: "Segment", variants: [{ tone: "warm", subject: "Hello", body: "fallback" }] }] };
}
