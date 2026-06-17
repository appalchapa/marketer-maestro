import { getContainer } from "@composition/container";
import type { ModelCallEvent } from "@core/observability/optimization-event.types";

async function main() {
  const { modelProvider, eventBus, mode } = getContainer();

  // Subscribe to the event bus exactly like a dashboard or trace view would.
  const events: ModelCallEvent[] = [];
  eventBus.subscribe((e) => events.push(e));

  console.log(`\nMarketer Maestro — pipeline demo (mode: ${mode})\n`);

  const req = {
    sessionId: "demo-session",
    component: "intent",
    system: "You are a Chief Marketing Strategist.",
    prompt: "Reduce churn by 10% in 2 months for a telecom company.",
    promptVersion: "intent@v1",
    difficulty: "simple" as const,
  };

  console.log("→ First call (expect a real generation, tokens billed):");
  const r1 = await modelProvider.generate(req);
  console.log("   model:", r1.model, "| text:", r1.text.slice(0, 70), "...\n");

  console.log("→ Second identical call (expect a CACHE HIT, 0 tokens):");
  const r2 = await modelProvider.generate(req);
  console.log("   model:", r2.model, "\n");

  console.log("Captured optimization events (what the UI tabs read):");
  for (const e of events) {
    console.log(
      `   [${e.component}] model=${e.model} cacheHit=${e.cacheHit} ` +
      `tokens=${e.tokensIn}/${e.tokensOut} cost=$${e.costUsd.toFixed(6)} ${e.latencyMs}ms`
    );
  }
  console.log("\nNote: the 2nd call shows cacheHit=true and 0 cost — caching working.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
