import { NextResponse } from "next/server";
import { getContainer } from "@composition/container";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "true";
  const username = url.searchParams.get("username");
  const { userStore } = getContainer();
  if (all) {
    const sessions = await userStore.listAll();
    return NextResponse.json({ sessions });
  }
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });
  const sessions = await userStore.listByUser(username);
  return NextResponse.json({ sessions });
}
