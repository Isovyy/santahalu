import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loadRejectedPairs } from "@/lib/rejectedPairs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  const run = await db.orm.public.MatchRun.first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  // Save this run's reports into RejectedPair before they go — later runs
  // still need to know who rejected whom.
  await loadRejectedPairs();

  // Match rows cascade-delete with the run (onDelete: Cascade in the
  // schema) — participants and their responses are untouched.
  await db.orm.public.MatchRun.where({ id: runId }).delete();

  return NextResponse.json({ ok: true });
}
