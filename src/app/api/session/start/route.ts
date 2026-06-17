import { getContainer } from "@composition/container";
import { streamRun } from "../_stream";

export async function POST(req: Request) {
  const { username, goalText, vertical, attributes } = await req.json();
  if (!username || !goalText) return new Response("username and goalText required", { status: 400 });
  const { maestro } = getContainer();
  const id = maestro.newId();
  const attrs: string[] = Array.isArray(attributes) ? attributes.filter((a: unknown) => typeof a === "string" && a.trim()) : [];
  return streamRun(id, () => maestro.startSession(id, username, goalText, vertical || "General", attrs));
}
