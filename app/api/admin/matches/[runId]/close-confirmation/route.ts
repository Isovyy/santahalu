import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { closed?: unknown; round?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const closed = body.closed === true;
  const round = body.round === 2 ? 2 : 1;

  const run = await db.orm.public.MatchRun.first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  const closedAt = closed ? Temporal.Now.instant() : null;
  await db.orm.public.MatchRun.where({ id: runId }).update(
    round === 2 ? { confirmation2ClosedAt: closedAt } : { confirmationClosedAt: closedAt },
  );

  return NextResponse.json({ ok: true, round, closed });
}
