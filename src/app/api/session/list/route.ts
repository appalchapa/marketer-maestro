import { NextResponse } from "next/server";
import { getContainer } from "@composition/container";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = url.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });
  const { userStore } = getContainer();
  const sessions = await userStore.listByUser(username);
  return NextResponse.json({ sessions });
}
