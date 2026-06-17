import type { ModelProvider, ModelRequest, ModelResponse } from "@core/ports/model-provider.port";

// Returns a stored answer for a repeated request, for zero tokens. Enablement is
// a getter so the Settings console can toggle caching at runtime and you can watch
// cost change on the next run. The "cache:" prefix lets the cost-meter detect a hit.
export class SemanticCacheWrapper implements ModelProvider {
  readonly name: string;
  readonly label: string;
  private store = new Map<string, ModelResponse>();
  constructor(private inner: ModelProvider, private isEnabled: () => boolean) {
    this.name = `cache(${inner.name})`;
    this.label = inner.label ?? inner.name;
  }
  private key(req: ModelRequest): string {
    return `${req.component}::${req.json ? "json" : "text"}::${req.system ?? ""}::${req.prompt}`;
  }
  async generate(req: ModelRequest): Promise<ModelResponse> {
    if (!this.isEnabled()) return this.inner.generate(req);
    const k = this.key(req);
    const hit = this.store.get(k);
    if (hit) return { ...hit, model: `cache:${hit.model}` };
    const res = await this.inner.generate(req);
    this.store.set(k, res);
    return res;
  }
}
