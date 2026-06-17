import type { ModelProvider } from "@core/ports/model-provider.port";
import type { EventBus } from "@core/observability/event-bus.port";
import type { StatusBus } from "@core/observability/status-bus.port";
import { CostMeterWrapper } from "./cost-meter.wrapper";
import { SemanticCacheWrapper } from "./semantic-cache.wrapper";
import { TimeoutWrapper } from "./timeout.wrapper";
import { FallbackWrapper } from "./fallback.wrapper";

export interface PipelineToggles { cache: boolean; timeoutMs: number; }

// Builds the decorator chain. Order (outer -> inner):
//   cost-meter -> cache -> fallback( timeout(primary), timeout(backup) )
export function composePipeline(
  primary: ModelProvider,
  backup: ModelProvider | null,
  bus: EventBus,
  status: StatusBus,
  toggles: PipelineToggles,
): ModelProvider {
  const p = new TimeoutWrapper(primary, toggles.timeoutMs, status);
  const reliable: ModelProvider = backup
    ? new FallbackWrapper(p, new TimeoutWrapper(backup, toggles.timeoutMs, status), status)
    : p;
  let chain: ModelProvider = reliable;
  chain = new SemanticCacheWrapper(chain, toggles.cache);
  chain = new CostMeterWrapper(chain, bus);
  return chain;
}
