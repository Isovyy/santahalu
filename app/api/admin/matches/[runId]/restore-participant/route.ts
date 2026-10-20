import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";

// Undoes remove-participant: takes the person off this run's removed list and
// recreates their former pairs where those slots are still free. A slot that
// has since been filled (e.g. their old receiver got a new giver in a
// reshuffle) is left alone — they come back as "No giver" / "No receiver"
// on that side instead, to be filled by a reshuffle or force-match.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { participantId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const participantId = typeof body.participantId === "string" ? body.participantId : "";
  if (!participantId) {
    return NextResponse.json({ error: "participantId wajib diisi" }, { status: 400 });
  }

  const run = await db.orm.public.MatchRun.include("matches").first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  const removal = await db.orm.public.MatchRunRemoval
    .where({ matchRunId: runId })
    .where({ participantId })
    .first();
  if (!removal) {
    return NextResponse.json({ error: "Peserta ini tidak ada di daftar dihapus." }, { status: 404 });
  }

  const [participant, removals] = await Promise.all([
    db.orm.public.Participant.first({ id: participantId }),
    db.orm.public.MatchRunRemoval.where({ matchRunId: runId }).all(),
  ]);
  if (!participant) {
    return NextResponse.json({ error: "Peserta tidak ditemukan." }, { status: 404 });
  }

  await db.orm.public.MatchRunRemoval.where({ id: removal.id }).delete();

  const stillRemoved = new Set(
    removals.filter((r) => r.participantId !== participantId).map((r) => r.participantId),
  );
  const hasReceiver = new Set(run.matches.map((m) => m.giverId));
  const hasGiver = new Set(run.matches.map((m) => m.receiverId));

  // Restored pairs get a log entry like any other reassignment, which also
  // puts them in confirmation round #2 (lib/confirmRound.ts).
  async function restorePair(giverId: string, receiverId: string) {
    const [giver, receiver] = await Promise.all([
      db.orm.public.Participant.first({ id: giverId }),
      db.orm.public.Participant.first({ id: receiverId }),
    ]);
    if (!giver || !receiver) return null;
    await db.orm.public.Match.create({ matchRunId: runId, giverId, receiverId });
    await db.orm.public.MatchReshuffleLog
      .where({ matchRunId: runId })
      .where({ giverTwt: giver.twtUser })
      .delete();
    await db.orm.public.MatchReshuffleLog.create({
      matchRunId: runId,
      reshuffledAt: Temporal.Now.instant(),
      seed: null,
      giverTwt: giver.twtUser,
      previousReceiverTwt: "",
      previousReceiverOshiName: "",
      previousReceiverFandomYume: "",
      newReceiverTwt: receiver.twtUser,
      newReceiverOshiName: receiver.oshiName,
      newReceiverFandomYume: receiver.fandomYume,
    });
    hasReceiver.add(giverId);
    hasGiver.add(receiverId);
    return `${giver.twtUser} → ${receiver.twtUser}`;
  }

  const restored: string[] = [];
  const notRestored: string[] = [];

  const formerReceiverId = removal.formerReceiverId;
  if (formerReceiverId) {
    if (
      !hasReceiver.has(participantId) &&
      !hasGiver.has(formerReceiverId) &&
      !stillRemoved.has(formerReceiverId)
    ) {
      const pair = await restorePair(participantId, formerReceiverId);
      if (pair) restored.push(pair);
    } else {
      notRestored.push("receiver lama sudah punya giver lain atau sedang dihapus");
    }
  }

  const formerGiverId = removal.formerGiverId;
  if (formerGiverId) {
    if (
      !hasGiver.has(participantId) &&
      !hasReceiver.has(formerGiverId) &&
      !stillRemoved.has(formerGiverId)
    ) {
      const pair = await restorePair(formerGiverId, participantId);
      if (pair) restored.push(pair);
    } else {
      notRestored.push("giver lama sudah punya receiver lain atau sedang dihapus");
    }
  }

  if (restored.length > 0) {
    await db.orm.public.MatchRun.where({ id: runId }).update({
      matchedPairs: run.matchedPairs + restored.length,
    });
  }

  return NextResponse.json({
    ok: true,
    restoredTwt: participant.twtUser,
    restored,
    notRestored,
  });
}
