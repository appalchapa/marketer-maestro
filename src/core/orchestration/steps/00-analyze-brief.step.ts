import type { ModelProvider } from "@core/ports/model-provider.port";
import { BriefAnalysisSchema, type BriefAnalysis } from "@core/domain/brief/brief.schema";
import { parseJsonLoose } from "@shared/safe-json";
import { PROMPTS, buildPrompt } from "@core/prompts/catalog";

// Stage 0 (brief intake): analyze a campaign brief into editable intent + clarifying questions + suggestions.
// The brief text is transient — used here and not persisted.
export async function analyzeBrief(provider: ModelProvider, briefText: string): Promise<BriefAnalysis> {
  const res = await provider.generate({
    sessionId: "brief-intake", component: "brief", promptVersion: PROMPTS.brief.version, difficulty: "simple", json: true,
    system: PROMPTS.brief.system,
    prompt: buildPrompt("brief", { briefText: briefText.slice(0, 8000) }),  // cap to keep prompt bounded
  });
  const parsed: any = parseJsonLoose(res.text);
  // The model may use goalType or goalText; normalize to goalText.
  if (parsed && !parsed.goalText && parsed.goalType) parsed.goalText = parsed.goalType;
  const r = BriefAnalysisSchema.safeParse(parsed);
  return r.success ? r.data : { goalText: "", vertical: "General", attributes: [], questions: ["What is the primary goal of this campaign?"], suggestions: [] };
}
