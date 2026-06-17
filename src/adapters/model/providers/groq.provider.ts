import type { ModelProvider, ModelRequest, ModelResponse } from "@core/ports/model-provider.port";

// Groq provider via its OpenAI-compatible endpoint. Fast + free; used as fallback.
export class GroqProvider implements ModelProvider {
  readonly name = "groq";
  private readonly model: string;
  constructor(private apiKey: string, model = "llama-3.3-70b-versatile") { this.model = model; }

  async generate(req: ModelRequest): Promise<ModelResponse> {
    const messages: any[] = [];
    if (req.system) messages.push({ role: "system", content: req.system });
    messages.push({ role: "user", content: req.prompt });

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: req.temperature ?? 0.6,
        ...(req.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: req.signal,
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const usage = data?.usage ?? {};
    return {
      text, model: this.model,
      tokensIn: usage.prompt_tokens ?? Math.ceil(req.prompt.length / 4),
      tokensOut: usage.completion_tokens ?? Math.ceil(text.length / 4),
    };
  }
}
