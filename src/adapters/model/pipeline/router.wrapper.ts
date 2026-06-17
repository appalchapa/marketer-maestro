import type { ModelProvider, ModelRequest, ModelResponse } from "@core/ports/model-provider.port";

// Picks a cheap provider for "simple" requests and a strong one for "hard" ones.
// Here it just chooses between two inner providers by the difficulty hint;
// the routing decision rides along so the Traces tab can show WHY.
export class RouterWrapper implements ModelProvider {
  readonly name = "router";
  constructor(private cheap: ModelProvider, private strong: ModelProvider) {}

  async generate(req: ModelRequest): Promise<ModelResponse> {
    const useCheap = (req.difficulty ?? "hard") === "simple";
    const chosen = useCheap ? this.cheap : this.strong;
    return chosen.generate(req);
  }
}
