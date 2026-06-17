import type { ModelProvider } from "@core/ports/model-provider.port";
import type { EventBus } from "@core/observability/event-bus.port";
import type { StatusBus } from "@core/observability/status-bus.port";
import { CostMeterWrapper } from "./cost-meter.wrapper";
import { SemanticCacheWrapper } from "./semantic-cache.wrapper";
import { TimeoutWrapper } from "./timeout.wrapper";
import { FallbackWrapper } from "./fallback.wrapper";

export interface PipelineOpts { cacheEnabled: () => boolean; timeoutMs: number; }

// cost-meter -> cache -> fallback( timeout(primary), timeout(backup) )
export function composePipeline(
  primary: ModelProvider,
  backup: ModelProvider | null,
  bus: EventBus,
  status: StatusBus,
  opts: PipelineOpts,
): ModelProvider {
  const p = new TimeoutWrapper(primary, opts.timeoutMs, status);
  const reliable: ModelProvider = backup
    ? new FallbackWrapper(p, new TimeoutWrapper(backup, opts.timeoutMs, status), status)
    : p;
  let chain: ModelProvider = reliable;
  chain = new SemanticCacheWrapper(chain, opts.cacheEnabled);
  chain = new CostMeterWrapper(chain, bus);
  return chain;
}
