import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { confirmRoundOf, isRoundClosed, reassignedGiverTwts } from "@/lib/confirmRound";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: { action?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const match = await db.orm.public.Match.include("giver").first({ confirmToken: token });
  if (!match) {
    return NextResponse.json({ error: "Link tidak valid." }, { status: 404 });
  }

  const run = await db.orm.public.MatchRun.first({ id: match.matchRunId });
  const round = confirmRoundOf(match.giver.twtUser, await reassignedGiverTwts(match.matchRunId));
  if (!run || isRoundClosed(run, round)) {
    return NextResponse.json(
      { error: `Konfirmasi #${round} sudah ditutup.` },
      { status: 403 },
    );
  }

  if (body.action === "confirm") {
    await db.orm.public.Match.where({ id: match.id }).update({
      confirmedAt: Temporal.Now.instant(),
      reportedAt: null,
      reportNote: null,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "report") {
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
    if (!note) {
      return NextResponse.json({ error: "Mohon isi keterangan masalahnya." }, { status: 400 });
    }
    await db.orm.public.Match.where({ id: match.id }).update({
      reportedAt: Temporal.Now.instant(),
      reportNote: note,
      confirmedAt: null,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
