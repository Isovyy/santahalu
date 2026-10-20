import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { canGiveTo } from "@/lib/matching";
import { loadRejectedPairs } from "@/lib/rejectedPairs";

// Manual rearranging from the reshuffle page: points one pair's giver at a
// receiver the admin picked. If that receiver already has a giver, the two
// givers swap receivers, so nobody ends up with two givers or none. Rule
// violations are allowed (the admin confirms them in the UI) and reported
// back; changed pairs get reset and logged like any reshuffle.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { matchId?: unknown; receiverId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  const receiverId = typeof body.receiverId === "string" ? body.receiverId : "";
  if (!matchId || !receiverId) {
    return NextResponse.json({ error: "Pilih pasangan dan receiver baru." }, { status: 400 });
  }

  const run = await db.orm.public.MatchRun
    .include("matches", (m) => m.include("giver").include("receiver"))
    .first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  const row = run.matches.find((m) => m.id === matchId);
  if (!row) {
    return NextResponse.json({ error: "Pasangan tidak ditemukan." }, { status: 404 });
  }
  if (receiverId === row.receiverId) {
    return NextResponse.json({ error: "Itu receiver yang sekarang." }, { status: 400 });
  }
  if (receiverId === row.giverId) {
    return NextResponse.json({ error: "Giver tidak bisa memberi ke dirinya sendiri." }, { status: 400 });
  }

  const removed = await db.orm.public.MatchRunRemoval.where({ matchRunId: runId }).all();
  if (removed.some((r) => r.participantId === receiverId)) {
    return NextResponse.json(
      { error: "Peserta ini sedang dihapus dari matching. Kembalikan dulu." },
      { status: 409 },
    );
  }

  const newReceiver = await db.orm.public.Participant.first({ id: receiverId });
  if (!newReceiver) {
    return NextResponse.json({ error: "Peserta tidak ditemukan." }, { status: 404 });
  }

  // The row currently holding the chosen receiver, if any — its giver gets
  // this row's old receiver in exchange.
  const other = run.matches.find((m) => m.receiverId === receiverId) ?? null;
  if (other && other.giverId === row.receiverId) {
    return NextResponse.json(
      {
        error: `Tukar tidak bisa: ${other.giver.twtUser} akan memberi ke dirinya sendiri.`,
      },
      { status: 400 },
    );
  }

  const changes = [
    { row, giver: row.giver, previous: row.receiver, next: newReceiver },
    ...(other
      ? [{ row: other, giver: other.giver, previous: other.receiver, next: row.receiver }]
      : []),
  ];

  // Records any current reports into RejectedPair before the reset below
  // clears them, same as a reshuffle — and tells us if the admin is putting
  // a giver back with someone they already rejected.
  const rejected = await loadRejectedPairs();

  for (const c of changes) {
    await db.orm.public.MatchReshuffleLog
      .where({ matchRunId: runId })
      .where({ giverTwt: c.giver.twtUser })
      .delete();
    await db.orm.public.MatchReshuffleLog.create({
      matchRunId: runId,
      reshuffledAt: Temporal.Now.instant(),
      seed: null,
      giverTwt: c.giver.twtUser,
      previousReceiverTwt: c.previous.twtUser,
      previousReceiverOshiName: c.previous.oshiName,
      previousReceiverFandomYume: c.previous.fandomYume,
      newReceiverTwt: c.next.twtUser,
      newReceiverOshiName: c.next.oshiName,
      newReceiverFandomYume: c.next.fandomYume,
    });
    await db.orm.public.Match.where({ id: c.row.id }).update({
      receiverId: c.next.id,
      notifiedAt: null,
      folderNotifiedAt: null,
      confirmToken: null,
      confirmedAt: null,
      reportedAt: null,
      reportNote: null,
      submittedAt: null,
      extensionDays: null,
      extensionRequestedAt: null,
      extensionReason: null,
    });
  }

  return NextResponse.json({
    ok: true,
    swapped: Boolean(other),
    pairs: changes.map((c) => ({
      giverTwt: c.giver.twtUser,
      previousReceiverTwt: c.previous.twtUser,
      newReceiverTwt: c.next.twtUser,
      followsRules: canGiveTo(c.giver, c.next),
      previouslyRejected: rejected.has(`${c.giver.id}:${c.next.id}`),
    })),
    // Moving to a free receiver leaves the old one without a giver.
    nowWithoutGiverTwt: other ? null : row.receiver.twtUser,
  });
}
