import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { loadRejectedPairs } from "@/lib/rejectedPairs";

interface Assignment {
  giverId: string;
  receiverId: string;
}

function parseAssignments(value: unknown): Assignment[] | null {
  if (!Array.isArray(value)) return null;
  const out: Assignment[] = [];
  for (const a of value) {
    if (
      !a ||
      typeof a !== "object" ||
      typeof (a as Assignment).giverId !== "string" ||
      typeof (a as Assignment).receiverId !== "string"
    ) {
      return null;
    }
    out.push({ giverId: (a as Assignment).giverId, receiverId: (a as Assignment).receiverId });
  }
  return out;
}

// Applies a playground draft: the full giver → receiver mapping the admin
// ended up with. Only the differences from the current run are written.
// `baseline` is the mapping the playground started from — if the run has
// changed since (someone else reshuffled, a participant was removed), the
// draft is refused rather than silently overwriting that work.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { assignments?: unknown; baseline?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const assignments = parseAssignments(body.assignments);
  const baseline = parseAssignments(body.baseline);
  if (!assignments || !baseline) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const run = await db.orm.public.MatchRun
    .include("matches", (m) => m.include("giver").include("receiver"))
    .first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  const key = (a: Assignment) => `${a.giverId}:${a.receiverId}`;
  const current = new Set(run.matches.map((m) => key(m)));
  const base = new Set(baseline.map(key));
  if (current.size !== base.size || [...current].some((k) => !base.has(k))) {
    return NextResponse.json(
      {
        error:
          "Pasangan sudah berubah sejak playground dibuka (ada reshuffle/perubahan lain). Muat ulang halaman lalu coba lagi.",
      },
      { status: 409 },
    );
  }

  // The final mapping has to be a valid one-to-one assignment on its own.
  const givers = new Set<string>();
  const receivers = new Set<string>();
  for (const a of assignments) {
    if (a.giverId === a.receiverId) {
      return NextResponse.json({ error: "Ada peserta yang memberi ke dirinya sendiri." }, { status: 400 });
    }
    if (givers.has(a.giverId) || receivers.has(a.receiverId)) {
      return NextResponse.json(
        { error: "Ada giver dengan 2 receiver atau receiver dengan 2 giver." },
        { status: 400 },
      );
    }
    givers.add(a.giverId);
    receivers.add(a.receiverId);
  }

  const [participants, removals] = await Promise.all([
    db.orm.public.Participant.all(),
    db.orm.public.MatchRunRemoval.where({ matchRunId: runId }).all(),
  ]);
  const byId = new Map(participants.map((p) => [p.id, p]));
  const removedIds = new Set(removals.map((r) => r.participantId));
  for (const id of [...givers, ...receivers]) {
    if (!byId.has(id)) {
      return NextResponse.json({ error: "Ada peserta yang tidak ditemukan." }, { status: 400 });
    }
    if (removedIds.has(id)) {
      return NextResponse.json(
        { error: `${byId.get(id)!.twtUser} sedang dihapus dari matching. Kembalikan dulu.` },
        { status: 409 },
      );
    }
  }

  // Records current reports into RejectedPair before the resets below clear
  // them, same as a reshuffle.
  await loadRejectedPairs();

  const rowOfGiver = new Map(run.matches.map((m) => [m.giverId, m]));
  const finalReceiverOf = new Map(assignments.map((a) => [a.giverId, a.receiverId]));

  let changed = 0;
  let created = 0;
  let deleted = 0;

  for (const [giverId, receiverId] of finalReceiverOf) {
    const row = rowOfGiver.get(giverId);
    if (row && row.receiverId === receiverId) continue;

    const giver = byId.get(giverId)!;
    const receiver = byId.get(receiverId)!;

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
      newReceiverTwt: receiver.twtUser,
      newReceiverOshiName: receiver.oshiName,
      newReceiverFandomYume: receiver.fandomYume,
    });

    if (row) {
      await db.orm.public.Match.where({ id: row.id }).update({
        receiverId,
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
      changed++;
    } else {
      await db.orm.public.Match.create({ matchRunId: runId, giverId, receiverId });
      created++;
    }
  }

  // Givers the draft left without a receiver.
  for (const row of run.matches) {
    if (finalReceiverOf.has(row.giverId)) continue;
    await db.orm.public.Match.where({ id: row.id }).delete();
    deleted++;
  }

  await db.orm.public.MatchRun.where({ id: runId }).update({
    matchedPairs: finalReceiverOf.size,
  });

  return NextResponse.json({ ok: true, changed, created, deleted });
}
