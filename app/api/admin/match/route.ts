import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchParticipants } from "@/lib/matching";
import { loadRejectedPairs } from "@/lib/rejectedPairs";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine, seed is optional
  }

  const rawSeed = body.seed;
  const seed =
    typeof rawSeed === "number" && Number.isFinite(rawSeed)
      ? rawSeed
      : typeof rawSeed === "string" && rawSeed.trim() && !Number.isNaN(Number(rawSeed))
        ? Number(rawSeed)
        : null;

  const participants = await db.orm.public.Participant.orderBy((p) => p.createdAt.asc()).all();

  if (participants.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 participants to run matching." },
      { status: 400 }
    );
  }

  // Nobody gets handed a receiver they already rejected in an earlier run.
  const rejectedPairs = await loadRejectedPairs();
  const { matches, stats } = matchParticipants(participants, seed ?? undefined, rejectedPairs);

  const run = await db.orm.public.MatchRun.create({
    seed,
    totalParticipants: stats.totalParticipants,
    matchedPairs: stats.matchedPairs,
    matches: (m) =>
      m.create(
        matches.map(([giverIdx, receiverIdx]) => ({
          giverId: participants[giverIdx].id,
          receiverId: participants[receiverIdx].id,
        })),
      ),
  });

  return NextResponse.json({ ok: true, runId: run.id, stats });
}
