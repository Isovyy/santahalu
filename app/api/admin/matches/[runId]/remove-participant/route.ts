import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Removes one participant from this match run entirely (both as giver and as
// receiver), without running any rematching. Used when someone goes
// unresponsive (never confirms, never reports) and the admin wants them out
// of the run right away — their former receiver and former giver fall into
// the existing "No giver" / "No receiver" pools, to be picked up by a
// reshuffle later whenever there's enough of a pool to work with.
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

  const run = await db.orm.public.MatchRun
    .include("matches", (m) => m.include("giver").include("receiver"))
    .first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  const target = run.matches.find((m) => m.id === matchId);
  if (!target) {
    return NextResponse.json({ error: "Pasangan tidak ditemukan" }, { status: 404 });
  }

  const participantId = target.giverId;
  const participantTwt = target.giver.twtUser;

  const rowsToDelete = run.matches.filter(
    (m) => m.giverId === participantId || m.receiverId === participantId,
  );

  for (const row of rowsToDelete) {
    await db.orm.public.Match.where({ id: row.id }).delete();
  }

  await db.orm.public.MatchRun.where({ id: runId }).update({
    matchedPairs: Math.max(0, run.matchedPairs - rowsToDelete.length),
  });

  const formerReceiverTwt =
    rowsToDelete.find((m) => m.giverId === participantId)?.receiver.twtUser ?? null;
  const formerGiverTwt =
    rowsToDelete.find((m) => m.receiverId === participantId)?.giver.twtUser ?? null;

  return NextResponse.json({
    ok: true,
    removedTwt: participantTwt,
    formerReceiverTwt,
    formerGiverTwt,
  });
}
