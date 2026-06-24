import type { ModelProvider } from "@core/ports/model-provider.port";
import { QaResultSchema, type QaResult } from "@core/domain/qa/qa.schema";
import { parseJsonLoose } from "@shared/safe-json";
import { PROMPTS, buildPrompt } from "@core/prompts/catalog";

// AI pre-send QA of a single content variant (brand / spam / clarity / CTA / subject).
export async function qaContent(provider: ModelProvider, subject: string, body: string, ctaText: string): Promise<QaResult> {
  const res = await provider.generate({
    sessionId: "qa", component: "qa", promptVersion: PROMPTS.qa.version, difficulty: "simple", json: true,
    system: PROMPTS.qa.system,
    prompt: buildPrompt("qa", { subject: subject || "", body: body || "", ctaText: ctaText || "" }),
  });
  const r = QaResultSchema.safeParse(parseJsonLoose(res.text));
  return r.success ? r.data : { scores: { brand: 0, spam: 0, clarity: 0, cta: 0, subject: 0 }, overall: 0, flags: ["QA could not be completed — try again."] };
}
