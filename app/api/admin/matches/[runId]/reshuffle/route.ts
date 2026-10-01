import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchBipartite } from "@/lib/matching";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { matchIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const matchIds = Array.isArray(body.matchIds)
    ? body.matchIds.filter((id): id is string => typeof id === "string")
    : [];
  if (matchIds.length < 2) {
    return NextResponse.json(
      { error: "Pilih minimal 2 pasangan untuk di-reshuffle." },
      { status: 400 },
    );
  }

  const run = await db.orm.public.MatchRun
    .include("matches", (m) => m.include("giver").include("receiver"))
    .first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  const selected = run.matches.filter((m) => matchIds.includes(m.id));
  if (selected.length !== matchIds.length) {
    return NextResponse.json({ error: "Beberapa pasangan tidak ditemukan." }, { status: 400 });
  }

  // "Broken givers" (need a new receiver) and "broken receivers" (need a new
  // giver): two separate sides, not one shared pool. See lib/matching.ts's
  // matchBipartite for why this can't just reuse matchParticipants directly.
  const givers = selected.map((m) => m.giver);
  const receivers = selected.map((m) => m.receiver);

  const { matches: pairs, stats } = matchBipartite(givers, receivers);

  const resolvedGiverIds = new Set<string>();
  const resolved: {
    giverTwt: string;
    previousReceiverTwt: string;
    newReceiverTwt: string;
    newReceiverOshiName: string;
    newReceiverFandomYume: string;
  }[] = [];

  for (const [giverIdx, receiverIdx] of pairs) {
    const giver = givers[giverIdx];
    const newReceiver = receivers[receiverIdx];
    const row = selected.find((m) => m.giverId === giver.id);
    if (!row) continue;

    await db.orm.public.Match.where({ id: row.id }).update({
      receiverId: newReceiver.id,
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
    resolvedGiverIds.add(giver.id);
    resolved.push({
      giverTwt: giver.twtUser,
      previousReceiverTwt: row.receiver.twtUser,
      newReceiverTwt: newReceiver.twtUser,
      newReceiverOshiName: newReceiver.oshiName,
      newReceiverFandomYume: newReceiver.fandomYume,
    });
  }

  const unresolved = givers
    .filter((g) => !resolvedGiverIds.has(g.id))
    .map((g) => ({ id: g.id, twtUser: g.twtUser }));

  return NextResponse.json({
    ok: true,
    poolSize: givers.length,
    matched: stats.matchedPairs,
    unmatched: stats.unmatchedGivers,
    resolved,
    unresolved,
  });
}
