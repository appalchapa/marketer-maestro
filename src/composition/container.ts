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
import { FileExampleStore } from "@adapters/example-store/file-example-store.adapter";
import { Maestro } from "@core/orchestration/maestro";

export interface Container {
  modelProvider: ModelProvider;
  eventBus: EventBus;
  statusBus: StatusBus;
  userStore: UserStore;
  maestro: Maestro;
  mode: string;
  primaryName: string;
  backupName: string | null;
}

let cached: Container | null = null;

export function getContainer(): Container {
  if (cached) return cached;
  const cfg = loadConfig();
  const bus = new InMemoryEventBus();
  const status = new InMemoryStatusBus();

  // Primary: Gemini if keyed, else mock. Backup: Groq if keyed.
  const primary: ModelProvider = cfg.geminiApiKey
    ? new GeminiProvider(cfg.geminiApiKey, "gemini-2.5-flash", cfg.simulateGeminiFail)
    : new MockProvider();
  const backup: ModelProvider | null = cfg.groqApiKey ? new GroqProvider(cfg.groqApiKey) : null;

  const modelProvider = composePipeline(primary, backup, bus, status, cfg.toggles);
  const userStore = new FileUserStore();
  const exampleStore = new FileExampleStore();
  const maestro = new Maestro(modelProvider, userStore, bus, exampleStore);

  cached = {
    modelProvider, eventBus: bus, statusBus: status, userStore, maestro,
    mode: cfg.mode, primaryName: primary.name, backupName: backup?.name ?? null,
  };
  return cached;
}
