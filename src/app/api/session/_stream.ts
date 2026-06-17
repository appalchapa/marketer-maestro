import { getContainer } from "@composition/container";
import type { Session } from "@core/domain/session/session.types";

// Runs an async op while streaming NDJSON status lines for one sessionId.
// Emits {type:"status"|"model"} during the run, then {type:"result"} or {type:"error"}.
export function streamRun(sessionId: string, op: () => Promise<Session | null>): Response {
  const { statusBus, eventBus } = getContainer();
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
      const unsubS = statusBus.subscribe((e) => { if (e.sessionId === sessionId) send({ type: "status", kind: e.kind, message: e.message }); });
      const unsubE = eventBus.subscribe((e) => {
        if (e.sessionId !== sessionId) return;
        send({ type: "model", model: e.model, cacheHit: e.cacheHit, tokens: e.tokensIn + e.tokensOut, cost: e.costUsd });
      });
      (async () => {
        try {
          const session = await op();
          if (session) send({ type: "result", session });
          else send({ type: "error", message: "Session not found" });
        } catch (e: any) {
          send({ type: "error", message: e?.message ?? "Unexpected error" });
        } finally {
          unsubS(); unsubE();
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
