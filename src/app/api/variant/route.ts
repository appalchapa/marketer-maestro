import { NextResponse } from "next/server";
import { getContainer } from "@composition/container";
import { generateVariant } from "@core/orchestration/steps/09-generate-variant.step";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sessionId = "adhoc", segment = "", tone = "warm", context = "", hint = "" } = body || {};
  try {
    const v = await getContainer().modelProvider.generate
      ? await generateVariant(getContainer().modelProvider, sessionId, segment, tone, context, hint)
      : null;
    return NextResponse.json(v);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "generation failed" }, { status: 500 });
  }
}
