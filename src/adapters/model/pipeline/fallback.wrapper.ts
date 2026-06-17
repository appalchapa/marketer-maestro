import type { ModelProvider, ModelRequest, ModelResponse } from "@core/ports/model-provider.port";
import type { StatusBus } from "@core/observability/status-bus.port";

// Tries the primary provider; on failure reports status and fails over to the
// backup, with one retry. Publishes live status so the UI can show what happened.
export class FallbackWrapper implements ModelProvider {
  readonly name: string;
  constructor(
    private primary: ModelProvider,
    private backup: ModelProvider,
    private status?: StatusBus,
  ) {
    this.name = `fallback(${primary.name}->${backup.name})`;
  }

  private info(sessionId: string, message: string, kind: "info" | "fallback" | "retry" | "error" = "info") {
    this.status?.publish({ sessionId, kind, message, at: Date.now() });
  }

  async generate(req: ModelRequest): Promise<ModelResponse> {
    this.info(req.sessionId, `Contacting ${this.primary.name}…`);
    try {
      return await this.primary.generate(req);
    } catch (e: any) {
      this.info(req.sessionId, `${this.primary.name} unavailable (${e?.message ?? "error"}). Switching to ${this.backup.name}…`, "fallback");
      try {
        return await this.backup.generate(req);
      } catch {
        this.info(req.sessionId, `Retrying ${this.backup.name}…`, "retry");
        await new Promise((r) => setTimeout(r, 400));
        try {
          return await this.backup.generate(req);
        } catch (e2: any) {
          this.info(req.sessionId, `All providers unavailable. Please try again shortly.`, "error");
          throw new Error("All model providers are currently unavailable");
        }
      }
    }
  }
}
