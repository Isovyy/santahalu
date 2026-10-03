import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { findMinimalBreakChain, canGiveTo, type ChainStep } from "@/lib/matching";

interface StepOut {
  giverTwt: string;
  previousReceiverTwt: string | null;
  newReceiverTwt: string;
  newReceiverOshiName: string;
  newReceiverFandomYume: string;
  wasConfirmed: boolean;
}

interface ChainOut {
  stuckGiverTwt: string;
  steps: StepOut[];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { giverIds?: unknown; dryRun?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const giverIds = Array.isArray(body.giverIds)
    ? body.giverIds.filter((id): id is string => typeof id === "string")
    : [];
  if (giverIds.length === 0) {
    return NextResponse.json({ error: "Tidak ada giver yang perlu dicarikan solusi." }, { status: 400 });
  }
  const dryRun = body.dryRun === true;

  const run = await db.orm.public.MatchRun
    .include("matches", (m) => m.include("giver").include("receiver"))
    .first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  const participants = await db.orm.public.Participant.all();
  const byId = new Map(participants.map((p) => [p.id, p]));

  // Current full matching state for this run, as the chain search's starting
  // point — not a hand-picked subset, so a chain can route through any
  // existing match, confirmed or not.
  const currentReceiverOfGiver = new Map<string, string>(
    run.matches.map((m) => [m.giverId, m.receiverId]),
  );
  // Which row (if any) a giver currently has, so an apply can update it in
  // place instead of creating a duplicate. Snapshot from before any chain in
  // this batch applies — if two different stuck givers' chains both happen
  // to route through the same intermediate giver, that giver's logged
  // "previous receiver" reflects their pre-batch state, not the mid-batch
  // state from the first chain. The actual Match row always ends up correct
  // (last write wins); only that one log entry could read stale in this
  // narrow overlap case.
  const rowOfGiver = new Map(run.matches.map((m) => [m.giverId, m]));

  const excludePairs = new Set(
    run.matches.filter((m) => m.reportedAt).map((m) => `${m.giverId}:${m.receiverId}`),
  );

  const chains: { stuckGiverId: string; steps: ChainStep[] }[] = [];
  const unresolvable: string[] = [];

  for (const giverId of giverIds) {
    const chain = findMinimalBreakChain(giverId, participants, currentReceiverOfGiver, excludePairs);
    if (!chain) {
      const twt = byId.get(giverId)?.twtUser ?? giverId;
      unresolvable.push(twt);
      continue;
    }
    // Lock this chain in before searching for the next stuck giver, so later
    // searches see what's already been claimed.
    for (const step of chain) {
      currentReceiverOfGiver.set(step.giverId, step.newReceiverId);
    }
    chains.push({ stuckGiverId: giverId, steps: chain });
  }

  const chainsOut: ChainOut[] = [];
  const blocked: { giverTwt: string; wouldBeReceiverTwt: string }[] = [];

  for (const { stuckGiverId, steps } of chains) {
    const stepsOut: StepOut[] = [];
    for (const step of steps) {
      const giver = byId.get(step.giverId);
      const newReceiver = byId.get(step.newReceiverId);
      if (!giver || !newReceiver) continue;

      // Belt-and-suspenders, same as the manual reshuffle route: the chain
      // search only ever proposes pairs that already pass canGiveTo, so this
      // should never trip.
      if (!canGiveTo(giver, newReceiver)) {
        console.error("auto-resolve produced a rule-violating pair", giver.id, newReceiver.id);
        blocked.push({ giverTwt: giver.twtUser, wouldBeReceiverTwt: newReceiver.twtUser });
        continue;
      }

      const row = rowOfGiver.get(step.giverId);
      const wasConfirmed = Boolean(row?.confirmedAt);

      if (!dryRun) {
        // Riwayat shows each giver's current pairing history, not a full
        // audit trail — reshuffling the same giver again replaces their
        // earlier entry rather than piling up now-stale ones.
        await db.orm.public.MatchReshuffleLog
          .where({ matchRunId: runId })
          .where({ giverTwt: giver.twtUser })
          .delete();
        await db.orm.public.MatchReshuffleLog.create({
          matchRunId: runId,
          reshuffledAt: Temporal.Now.instant(),
          seed: null,
          giverTwt: giver.twtUser,
          previousReceiverTwt: row?.receiver.twtUser ?? "",
          previousReceiverOshiName: row?.receiver.oshiName ?? "",
          previousReceiverFandomYume: row?.receiver.fandomYume ?? "",
          newReceiverTwt: newReceiver.twtUser,
          newReceiverOshiName: newReceiver.oshiName,
          newReceiverFandomYume: newReceiver.fandomYume,
        });

        if (row) {
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
        } else {
          await db.orm.public.Match.create({
            matchRunId: runId,
            giverId: giver.id,
            receiverId: newReceiver.id,
          });
          await db.orm.public.MatchRun.where({ id: runId }).update({
            matchedPairs: run.matchedPairs + 1,
          });
          run.matchedPairs += 1;
        }
      }

      stepsOut.push({
        giverTwt: giver.twtUser,
        previousReceiverTwt: row?.receiver.twtUser ?? null,
        newReceiverTwt: newReceiver.twtUser,
        newReceiverOshiName: newReceiver.oshiName,
        newReceiverFandomYume: newReceiver.fandomYume,
        wasConfirmed,
      });
    }

    const stuckGiver = byId.get(stuckGiverId);
    chainsOut.push({
      stuckGiverTwt: stuckGiver?.twtUser ?? stuckGiverId,
      steps: stepsOut,
    });
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    chains: chainsOut,
    unresolvable,
    blocked,
  });
}
