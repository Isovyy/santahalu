import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { closed?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const closed = body.closed === true;

  const run = await db.orm.public.MatchRun.first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  await db.orm.public.MatchRun.where({ id: runId }).update({
    confirmationClosedAt: closed ? Temporal.Now.instant() : null,
  });

  return NextResponse.json({ ok: true, closed });
}
