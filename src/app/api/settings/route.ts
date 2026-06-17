import { NextResponse } from "next/server";
import { getContainer } from "@composition/container";
import { PROMPTS } from "@core/prompts/catalog";

function snapshot() {
  const c = getContainer();
  return {
    mode: c.mode,
    primary: c.primaryName,
    backup: c.backupName,
    timeoutMs: c.timeoutMs,
    simulateGeminiFail: c.simulateGeminiFail,
    cacheEnabled: c.runtime.cacheEnabled,
    prompts: Object.entries(PROMPTS).map(([component, p]) => ({ component, version: p.version, system: p.system, template: p.template })),
  };
}
export async function GET() { return NextResponse.json(snapshot()); }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (typeof body.cacheEnabled === "boolean") getContainer().runtime.cacheEnabled = body.cacheEnabled;
  return NextResponse.json(snapshot());
}
