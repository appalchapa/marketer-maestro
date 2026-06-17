import { getContainer } from "@composition/container";
import { streamRun } from "../_stream";

export async function POST(req: Request) {
  const { sessionId, action, edited, feedback, thumb } = await req.json();
  const { maestro } = getContainer();
  if (action === "approve") return streamRun(sessionId, () => maestro.approve(sessionId, edited, thumb));
  if (action === "revise") {
    if (!feedback) return new Response("feedback required", { status: 400 });
    return streamRun(sessionId, () => maestro.revise(sessionId, feedback));
  }
  return new Response("unknown action", { status: 400 });
}
