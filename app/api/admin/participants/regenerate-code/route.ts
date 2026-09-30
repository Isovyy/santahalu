import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateEditCode, hashEditCode } from "@/lib/editCode";

// Protected automatically by proxy.ts's /api/admin/:path* matcher.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const participantId = typeof body.participantId === "string" ? body.participantId : "";
  if (!participantId) {
    return NextResponse.json({ error: "Missing participantId" }, { status: 400 });
  }

  const editCode = generateEditCode();
  const participant = await db.orm.public.Participant
    .where({ id: participantId })
    .update({ editCodeHash: hashEditCode(editCode) });

  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, editCode });
}
