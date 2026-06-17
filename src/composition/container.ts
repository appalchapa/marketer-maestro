import { loadConfig } from "@config/app.config";
import type { ModelProvider } from "@core/ports/model-provider.port";
import type { EventBus } from "@core/observability/event-bus.port";
import type { StatusBus } from "@core/observability/status-bus.port";
import type { UserStore } from "@core/ports/user-store.port";
import { InMemoryEventBus } from "@core/observability/in-memory-event-bus";
import { InMemoryStatusBus } from "@core/observability/in-memory-status-bus";
import { MockProvider } from "@adapters/model/providers/mock.provider";
import { GeminiProvider } from "@adapters/model/providers/gemini.provider";
import { GroqProvider } from "@adapters/model/providers/groq.provider";
import { composePipeline } from "@adapters/model/pipeline/compose-pipeline";
import { FileUserStore } from "@adapters/user-store/file-user-store.adapter";
import { UpstashUserStore } from "@adapters/user-store/upstash-user-store.adapter";
import { FileExampleStore } from "@adapters/example-store/file-example-store.adapter";
import { Maestro } from "@core/orchestration/maestro";

// Mutable runtime settings the Settings console can change (process-lifetime).
export interface RuntimeSettings { cacheEnabled: boolean; }

export interface Container {
  modelProvider: ModelProvider;
  eventBus: EventBus;
  statusBus: StatusBus;
  userStore: UserStore;
  maestro: Maestro;
  mode: string;
  primaryName: string;
  backupName: string | null;
  timeoutMs: number;
  simulateGeminiFail: boolean;
  runtime: RuntimeSettings;
}

let cached: Container | null = null;

export function getContainer(): Container {
  if (cached) return cached;
  const cfg = loadConfig();
  const bus = new InMemoryEventBus();
  const status = new InMemoryStatusBus();
  const runtime: RuntimeSettings = { cacheEnabled: cfg.toggles.cache };

  const usingReal = Boolean(cfg.geminiApiKey);
  const primary: ModelProvider = usingReal
    ? new GeminiProvider(cfg.geminiApiKey!, "gemini-2.5-flash", cfg.simulateGeminiFail)
    : new MockProvider();
  const backup: ModelProvider | null = cfg.groqApiKey ? new GroqProvider(cfg.groqApiKey) : null;

  const modelProvider = composePipeline(primary, backup, bus, status, {
    cacheEnabled: () => runtime.cacheEnabled,
    timeoutMs: cfg.toggles.timeoutMs,
  });
  let userStore: UserStore;
  if (cfg.storage === "upstash" && cfg.upstashUrl && cfg.upstashToken) {
    userStore = new UpstashUserStore(cfg.upstashUrl, cfg.upstashToken);
  } else {
    userStore = new FileUserStore();   // default; also the safe fallback if creds are absent
  }
  const exampleStore = new FileExampleStore();
  const maestro = new Maestro(modelProvider, userStore, bus, exampleStore);

  cached = {
    modelProvider, eventBus: bus, statusBus: status, userStore, maestro,
    mode: cfg.mode, primaryName: primary.name, backupName: backup?.name ?? null,
    timeoutMs: cfg.toggles.timeoutMs, simulateGeminiFail: cfg.simulateGeminiFail, runtime,
  };
  return cached;
}
