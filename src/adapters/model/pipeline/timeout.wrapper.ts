import type { ModelProvider, ModelRequest, ModelResponse } from "@core/ports/model-provider.port";
import type { StatusBus } from "@core/observability/status-bus.port";

// Bounds how long one provider may take. On timeout it aborts, reports status,
// and throws — letting the fallback wrapper move to the next provider.
export class TimeoutWrapper implements ModelProvider {
  readonly name: string;
  constructor(private inner: ModelProvider, private ms: number, private status?: StatusBus) {
    this.name = `timeout(${inner.name})`;
  }
  async generate(req: ModelRequest): Promise<ModelResponse> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.ms);
    try {
      return await this.inner.generate({ ...req, signal: ctrl.signal });
    } catch (e: any) {
      if (ctrl.signal.aborted) {
        this.status?.publish({ sessionId: req.sessionId, kind: "timeout", at: Date.now(),
          message: `${this.inner.name} timed out after ${Math.round(this.ms / 1000)}s` });
        throw new Error(`${this.inner.name} timed out`);
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }
}
