import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { ruleViolations } from "@/lib/matching";

// Manually pairs a giver who currently has no receiver with a receiver who
// currently has no giver, even when the pair breaks the matching rules
// (fandom, language, avoid list, ...). Used when the leftover "No receiver"
// and "No giver" people can't be matched automatically but still need to be
// in the run — once the row exists it's a normal pair, so it can be ticked
// into a later reshuffle (e.g. after someone edits their fandoms) and swapped
// for a valid pairing.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { giverId?: unknown; receiverId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const giverId = typeof body.giverId === "string" ? body.giverId : "";
  const receiverId = typeof body.receiverId === "string" ? body.receiverId : "";
  if (!giverId || !receiverId) {
    return NextResponse.json({ error: "Pilih giver dan receiver." }, { status: 400 });
  }
  if (giverId === receiverId) {
    return NextResponse.json(
      { error: "Giver dan receiver tidak boleh orang yang sama." },
      { status: 400 },
    );
  }

  const run = await db.orm.public.MatchRun.include("matches").first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  // Only fills gaps — never overwrites an existing pairing, so this can't
  // leave someone giving twice or a receiver with two givers.
  if (run.matches.some((m) => m.giverId === giverId)) {
    return NextResponse.json({ error: "Giver ini sudah punya receiver." }, { status: 409 });
  }
  if (run.matches.some((m) => m.receiverId === receiverId)) {
    return NextResponse.json({ error: "Receiver ini sudah punya giver." }, { status: 409 });
  }

  const removed = await db.orm.public.MatchRunRemoval.where({ matchRunId: runId }).all();
  if (removed.some((r) => r.participantId === giverId || r.participantId === receiverId)) {
    return NextResponse.json(
      { error: "Peserta ini sedang dihapus dari matching. Kembalikan dulu." },
      { status: 409 },
    );
  }

  const [giver, receiver] = await Promise.all([
    db.orm.public.Participant.first({ id: giverId }),
    db.orm.public.Participant.first({ id: receiverId }),
  ]);
  if (!giver || !receiver) {
    return NextResponse.json({ error: "Peserta tidak ditemukan." }, { status: 404 });
  }

  await db.orm.public.Match.create({ matchRunId: runId, giverId, receiverId });
  await db.orm.public.MatchRun.where({ id: runId }).update({
    matchedPairs: run.matchedPairs + 1,
  });

  // Shows up in Riwayat like any other reassignment.
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

  return NextResponse.json({
    ok: true,
    giverTwt: giver.twtUser,
    receiverTwt: receiver.twtUser,
    violations: ruleViolations(giver, receiver),
  });
}
