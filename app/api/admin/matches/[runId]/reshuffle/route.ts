import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { matchBipartite, canGiveTo } from "@/lib/matching";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { matchIds?: unknown; seed?: unknown; dryRun?: unknown };
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

  // A seed makes the shuffle reproducible, so admins can preview a few
  // attempts and re-apply whichever one they liked. No seed given (first
  // preview of a batch) gets a random one, reported back so the UI can pin
  // it for a follow-up preview or the real apply. Bounded well under 2^31-1
  // since MatchReshuffleLog.seed is a 32-bit Postgres int — Date.now() would
  // overflow it.
  const seed =
    typeof body.seed === "number" &&
    Number.isFinite(body.seed) &&
    Math.abs(body.seed) <= 2_000_000_000
      ? body.seed
      : Math.floor(Math.random() * 2_000_000_000);
  const dryRun = body.dryRun === true;

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

  // A giver who reported a problem with their current receiver must never
  // get reassigned back to that same person by the reshuffle — the report
  // IS a rejection of that specific pairing, not just a generic "something's
  // wrong" flag.
  const rejectedPairs = new Set(
    selected.filter((m) => m.reportedAt).map((m) => `${m.giverId}:${m.receiverId}`),
  );

  const { matches: pairs, stats } = matchBipartite(givers, receivers, seed, rejectedPairs);

  const resolvedGiverIds = new Set<string>();
  // A receiver whose original row's giver didn't end up with it (someone
  // else in the batch got matched to them instead) — that original giver's
  // row needs cleaning up afterward, or two rows end up claiming the same
  // receiver.
  const stolenFromGiverIds = new Set<string>();
  const resolved: {
    giverTwt: string;
    previousReceiverTwt: string;
    newReceiverTwt: string;
    newReceiverOshiName: string;
    newReceiverFandomYume: string;
  }[] = [];
  const blocked: { giverTwt: string; wouldBeReceiverTwt: string }[] = [];

  for (const [giverIdx, receiverIdx] of pairs) {
    const giver = givers[giverIdx];
    const newReceiver = receivers[receiverIdx];

    // Belt-and-suspenders: matchBipartite only ever proposes pairs that
    // already pass canGiveTo (same-oshi, language, fandom, avoid list), so
    // this should never trip. If it ever does, refuse to write the pairing
    // rather than trust a result that contradicts the rules it's supposed
    // to have already checked.
    if (!canGiveTo(giver, newReceiver)) {
      console.error("reshuffle produced a rule-violating pair", giver.id, newReceiver.id);
      blocked.push({ giverTwt: giver.twtUser, wouldBeReceiverTwt: newReceiver.twtUser });
      continue;
    }

    const row = selected.find((m) => m.giverId === giver.id);
    if (!row) continue;

    const originalRow = selected.find((m) => m.receiverId === newReceiver.id);
    if (originalRow && originalRow.giverId !== giver.id) {
      stolenFromGiverIds.add(originalRow.giverId);
    }

    if (!dryRun) {
      // Riwayat shows each giver's current pairing history, not a full
      // audit trail — reshuffling the same giver again (e.g. trying a few
      // seeds before settling on one) replaces their earlier entry rather
      // than piling up now-stale ones.
      await db.orm.public.MatchReshuffleLog
        .where({ matchRunId: runId })
        .where({ giverTwt: giver.twtUser })
        .delete();
      await db.orm.public.MatchReshuffleLog.create({
        matchRunId: runId,
        reshuffledAt: Temporal.Now.instant(),
        seed,
        giverTwt: giver.twtUser,
        previousReceiverTwt: row.receiver.twtUser,
        previousReceiverOshiName: row.receiver.oshiName,
        previousReceiverFandomYume: row.receiver.fandomYume,
        newReceiverTwt: newReceiver.twtUser,
        newReceiverOshiName: newReceiver.oshiName,
        newReceiverFandomYume: newReceiver.fandomYume,
      });
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
    }
    resolvedGiverIds.add(giver.id);
    resolved.push({
      giverTwt: giver.twtUser,
      previousReceiverTwt: row.receiver.twtUser,
      newReceiverTwt: newReceiver.twtUser,
      newReceiverOshiName: newReceiver.oshiName,
      newReceiverFandomYume: newReceiver.fandomYume,
    });
  }

  // Anyone whose receiver got reassigned to someone else, but who didn't
  // themselves land a new receiver, no longer has anyone to give to — their
  // row has to go (receiverId is required, can't just null it out), or
  // they'd keep claiming the receiver who's now also claimed elsewhere.
  const orphaned: { giverTwt: string; formerReceiverTwt: string }[] = [];
  for (const row of selected) {
    if (resolvedGiverIds.has(row.giverId) || !stolenFromGiverIds.has(row.giverId)) continue;
    orphaned.push({ giverTwt: row.giver.twtUser, formerReceiverTwt: row.receiver.twtUser });
    if (!dryRun) {
      await db.orm.public.Match.where({ id: row.id }).delete();
    }
  }
  if (!dryRun && orphaned.length > 0) {
    await db.orm.public.MatchRun.where({ id: runId }).update({
      matchedPairs: Math.max(0, run.matchedPairs - orphaned.length),
    });
  }

  const unresolved = givers
    .filter((g) => !resolvedGiverIds.has(g.id))
    .map((g) => ({ id: g.id, twtUser: g.twtUser }));

  return NextResponse.json({
    ok: true,
    seed,
    dryRun,
    poolSize: givers.length,
    matched: stats.matchedPairs,
    unmatched: stats.unmatchedGivers,
    resolved,
    unresolved,
    blocked,
    orphaned,
    rulesVerified: true,
  });
}
