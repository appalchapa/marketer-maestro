import type { ModelProvider } from "@core/ports/model-provider.port";
import { VariantGenSchema, type VariantGen } from "@core/domain/content/content.schema";
import { parseJsonLoose } from "@shared/safe-json";
import { PROMPTS, buildPrompt } from "@core/prompts/catalog";

// On-demand generation of a SINGLE content variant from a tone (+ optional hint).
export async function generateVariant(
  provider: ModelProvider, sessionId: string, segment: string, tone: string, context: string, hint?: string,
): Promise<VariantGen> {
  const res = await provider.generate({
    sessionId, component: "variant", promptVersion: PROMPTS.variant.version, difficulty: "simple", json: true,
    system: PROMPTS.variant.system,
    prompt: buildPrompt("variant", { segment, tone, context, hint: hint ? `\nExtra guidance: ${hint}` : "" }),
  });
  const r = VariantGenSchema.safeParse(parseJsonLoose(res.text));
  return r.success ? r.data : { subject: `${tone} message`, body: "", ctaText: "Learn More" };
}
