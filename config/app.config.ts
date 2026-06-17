export type RunMode = "local" | "live" | "bedrock";
export type DataMode = "live" | "demo";

export interface AppConfig {
  mode: RunMode;
  dataMode: DataMode;
  geminiApiKey?: string;
  groqApiKey?: string;
  simulateGeminiFail: boolean;
  toggles: { cache: boolean; timeoutMs: number };
}

export function loadConfig(): AppConfig {
  return {
    mode: (process.env.MAESTRO_MODE as RunMode) ?? "local",
    dataMode: (process.env.MAESTRO_DATA_MODE as DataMode) ?? "demo",
    geminiApiKey: process.env.GEMINI_API_KEY || undefined,
    groqApiKey: process.env.GROQ_API_KEY || undefined,
    simulateGeminiFail: (process.env.MAESTRO_SIMULATE_GEMINI_FAIL || "").toLowerCase() === "true",
    toggles: { cache: true, timeoutMs: Number(process.env.MAESTRO_TIMEOUT_MS ?? 45000) },
  };
}
