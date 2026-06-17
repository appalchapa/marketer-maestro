import type { ModelProvider, ModelRequest, ModelResponse } from "@core/ports/model-provider.port";
import type { EventBus } from "@core/observability/event-bus.port";
import { estimateCostUsd } from "./pricing";
import { newId } from "@shared/id";

// Wraps any provider. Measures latency + cost and publishes a ModelCallEvent.
// Sits outermost so it captures the TRUE end-to-end time and cost (incl. cache hits).
export class CostMeterWrapper implements ModelProvider {
  readonly name: string;
  readonly label: string;
  constructor(private inner: ModelProvider, private bus: EventBus) {
    this.name = `cost-meter(${inner.name})`;
    this.label = inner.label ?? inner.name;
  }

  async generate(req: ModelRequest): Promise<ModelResponse> {
    const started = Date.now();
    const res = await this.inner.generate(req);
    const latencyMs = Date.now() - started;
    // Cache hits are tagged on the response model string by the cache wrapper.
    const cacheHit = res.model.startsWith("cache:");
    const realModel = cacheHit ? res.model.slice("cache:".length) : res.model;

    this.bus.publish({
      id: newId("evt"),
      timestamp: started,
      sessionId: req.sessionId,
      component: req.component,
      model: realModel,
      promptVersion: req.promptVersion,
      cacheHit,
      tokensIn: cacheHit ? 0 : res.tokensIn,
      tokensOut: cacheHit ? 0 : res.tokensOut,
      costUsd: cacheHit ? 0 : estimateCostUsd(realModel, res.tokensIn, res.tokensOut),
      latencyMs,
    });
    return { ...res, model: realModel };
  }
}
