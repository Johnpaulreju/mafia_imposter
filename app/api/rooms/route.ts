import { NextResponse } from "next/server";
import { createRoom, joinRoom, updateConfig } from "@/lib/server-actions";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action === "create") return NextResponse.json(await createRoom(body));
    if (body.action === "join") return NextResponse.json(await joinRoom(body));
    if (body.action === "config") return NextResponse.json(await updateConfig(String(body.sessionId), body.config ?? {}));
    return NextResponse.json({ error: "Unknown room action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
  }
}
