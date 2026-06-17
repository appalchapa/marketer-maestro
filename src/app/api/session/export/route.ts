import { getContainer } from "@composition/container";
import { assembleBrief } from "@core/orchestration/steps/08-assemble-brief.step";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return new Response("sessionId required", { status: 400 });
  const { userStore } = getContainer();
  const session = await userStore.get(sessionId);
  if (!session) return new Response("not found", { status: 404 });

  const buf = await assembleBrief(session);
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="strategy-brief-${sessionId}.docx"`,
    },
  });
}
