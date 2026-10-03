import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { active?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const active = body.active !== false;

  const run = await db.orm.public.MatchRun.first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    // Only one run is ever active at a time.
    if (active) {
      await tx.orm.public.MatchRun.where((r) => r.isActive.eq(true)).update({ isActive: false });
    }
    await tx.orm.public.MatchRun.where({ id: runId }).update({ isActive: active });
  });

  return NextResponse.json({ ok: true, active });
}
