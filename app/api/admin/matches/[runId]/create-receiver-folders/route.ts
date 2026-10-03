import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createDriveFolder } from "@/lib/drive";

type CreateOutcome = "created" | "already_has_folder" | "not_found" | "failed";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { matchIds?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const matchIds = Array.isArray(body.matchIds)
    ? body.matchIds.filter((id): id is string => typeof id === "string")
    : [];
  if (matchIds.length === 0) {
    return NextResponse.json({ error: "Tidak ada pasangan yang dipilih." }, { status: 400 });
  }

  const run = await db.orm.public.MatchRun
    .include("matches", (m) => m.include("receiver"))
    .first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  const results: Record<string, CreateOutcome> = {};

  for (const matchId of matchIds) {
    const match = run.matches.find((m) => m.id === matchId);
    if (!match) {
      results[matchId] = "not_found";
      continue;
    }
    if (match.receiver.folderLink) {
      results[matchId] = "already_has_folder";
      continue;
    }
    try {
      const folderName = `${match.receiver.oshiName} - ${match.receiver.fandomYume}`;
      const link = await createDriveFolder(folderName);
      await db.orm.public.Participant.where({ id: match.receiver.id }).update({ folderLink: link });
      results[matchId] = "created";
    } catch (err) {
      console.error("create-receiver-folder failed", match.receiver.id, err);
      results[matchId] = "failed";
    }
  }

  return NextResponse.json({ ok: true, results });
}
