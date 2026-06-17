import type { ModelProvider, ModelRequest, ModelResponse } from "@core/ports/model-provider.port";

export class GeminiProvider implements ModelProvider {
  readonly name = "gemini";
  readonly label = "Gemini";
  private readonly model: string;
  constructor(private apiKey: string, model = "gemini-2.5-flash", private simulateFail = false) {
    this.model = model;
  }

  async generate(req: ModelRequest): Promise<ModelResponse> {
    // Demo helper: force a failure so the fallback to Groq can be shown live.
    if (this.simulateFail) throw new Error("Gemini 503 (simulated): UNAVAILABLE");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const generationConfig: Record<string, unknown> = { temperature: req.temperature ?? 0.6 };
    if (req.json) generationConfig.responseMimeType = "application/json";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: req.system ? { parts: [{ text: req.system }] } : undefined,
        contents: [{ role: "user", parts: [{ text: req.prompt }] }],
        generationConfig,
      }),
      signal: req.signal,
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const usage = data?.usageMetadata ?? {};
    return {
      text, model: this.model,
      tokensIn: usage.promptTokenCount ?? Math.ceil(req.prompt.length / 4),
      tokensOut: usage.candidatesTokenCount ?? Math.ceil(text.length / 4),
    };
  }
}
