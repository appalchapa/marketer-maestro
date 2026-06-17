import type { ModelProvider, ModelRequest, ModelResponse } from "@core/ports/model-provider.port";

// Returns a stored answer for a repeated request, for zero tokens.
// Demo uses an exact-key cache; a real semantic cache would embed the prompt and
// match by similarity — same interface, swap the key function. The "cache:" prefix
// on the model lets the cost-meter detect and zero-cost a hit.
export class SemanticCacheWrapper implements ModelProvider {
  readonly name: string;
  private store = new Map<string, ModelResponse>();
  constructor(private inner: ModelProvider, private enabled = true) {
    this.name = `cache(${inner.name})`;
  }

  private key(req: ModelRequest): string {
    return `${req.component}::${req.json ? "json" : "text"}::${req.system ?? ""}::${req.prompt}`;
  }

  async generate(req: ModelRequest): Promise<ModelResponse> {
    if (!this.enabled) return this.inner.generate(req);
    const k = this.key(req);
    const hit = this.store.get(k);
    if (hit) return { ...hit, model: `cache:${hit.model}` };
    const res = await this.inner.generate(req);
    this.store.set(k, res);
    return res;
  }
}
