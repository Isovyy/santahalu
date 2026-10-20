import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Clears a pair's "match email sent" mark so it can be selected and sent
// again (e.g. the email bounced or went to spam). The confirm token is kept,
// so a resend carries the same /confirm link as the first email.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { matchId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  if (!matchId) {
    return NextResponse.json({ error: "matchId wajib diisi" }, { status: 400 });
  }

  const match = await db.orm.public.Match.first({ id: matchId });
  if (!match || match.matchRunId !== runId) {
    return NextResponse.json({ error: "Pasangan tidak ditemukan" }, { status: 404 });
  }

  await db.orm.public.Match.where({ id: matchId }).update({ notifiedAt: null });

  return NextResponse.json({ ok: true });
}
