import { NextResponse } from "next/server";
import { getContainer } from "@composition/container";
import { analyzeBrief } from "@core/orchestration/steps/00-analyze-brief.step";

export async function POST(req: Request) {
  const { briefText } = await req.json().catch(() => ({ briefText: "" }));
  if (!briefText || !String(briefText).trim()) return NextResponse.json({ error: "briefText required" }, { status: 400 });
  try {
    const analysis = await analyzeBrief(getContainer().modelProvider, String(briefText));
    return NextResponse.json(analysis);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "analysis failed" }, { status: 500 });
  }
}
