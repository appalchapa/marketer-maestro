import type { ModelProvider, ModelRequest, ModelResponse } from "@core/ports/model-provider.port";
import type { StatusBus } from "@core/observability/status-bus.port";

// Turn any provider/SDK error into a short, human-readable reason (never a raw JSON dump).
export function cleanError(e: any): string {
  const m = String(e?.message ?? e ?? "");
  if (/429|resource_exhausted|quota|rate.?limit/i.test(m)) return "rate limit reached";
  if (/timed out|timeout|abort/i.test(m)) return "timed out";
  if (/401|403|unauthor|api key|invalid.*key|permission/i.test(m)) return "auth/key error";
  if (/5\d\d|server error|unavailable|fetch failed|network/i.test(m)) return "service error";
  return "unavailable";
}

// Tries the primary provider; on failure fails over to the backup, with one retry.
export class FallbackWrapper implements ModelProvider {
  readonly name: string;
  readonly label: string;
  constructor(private primary: ModelProvider, private backup: ModelProvider, private status?: StatusBus) {
    this.name = `fallback(${primary.name}->${backup.name})`;
    this.label = primary.label ?? primary.name;
  }
  private info(sessionId: string, message: string, kind: "info" | "fallback" | "retry" | "error" = "info") {
    this.status?.publish({ sessionId, kind, message, at: Date.now() });
  }
  private get pLabel() { return this.primary.label ?? this.primary.name; }
  private get bLabel() { return this.backup.label ?? this.backup.name; }

  async generate(req: ModelRequest): Promise<ModelResponse> {
    this.info(req.sessionId, `Contacting ${this.pLabel}…`);
    try {
      return await this.primary.generate(req);
    } catch (e: any) {
      this.info(req.sessionId, `${this.pLabel} unavailable (${cleanError(e)}). Switching to ${this.bLabel}…`, "fallback");
      try {
        return await this.backup.generate(req);
      } catch {
        this.info(req.sessionId, `Retrying ${this.bLabel}…`, "retry");
        await new Promise((r) => setTimeout(r, 400));
        try {
          return await this.backup.generate(req);
        } catch {
          this.info(req.sessionId, `All providers unavailable. Please try again shortly.`, "error");
          throw new Error("All model providers are currently unavailable");
        }
      }
    }
  }
}
