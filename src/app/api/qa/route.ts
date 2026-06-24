import { NextResponse } from "next/server";
import { getContainer } from "@composition/container";
import { qaContent } from "@core/orchestration/steps/10-qa-content.step";

export async function POST(req: Request) {
  const { subject = "", body = "", ctaText = "" } = await req.json().catch(() => ({}));
  try {
    const result = await qaContent(getContainer().modelProvider, String(subject), String(body), String(ctaText));
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "qa failed" }, { status: 500 });
  }
}
