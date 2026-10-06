import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createDriveFolder, shareFolder, unshareFolder } from "@/lib/drive";

// "created": new folder made (and shared). "shared": folder already existed,
// access granted to the current giver (and taken from an old one, if any).
// "already_done": folder exists and is already shared with the current giver.
type CreateOutcome = "created" | "shared" | "already_done" | "not_found" | "failed";

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
    .include("matches", (m) => m.include("giver").include("receiver"))
    .first({ id: runId });
  if (!run) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  const results: Record<string, CreateOutcome> = {};
  // Why a "failed" row failed (Drive's own message), so the admin page can
  // show it instead of a bare "Gagal".
  const errors: Record<string, string> = {};

  for (const matchId of matchIds) {
    const match = run.matches.find((m) => m.id === matchId);
    if (!match) {
      results[matchId] = "not_found";
      continue;
    }
    const receiver = match.receiver;
    const giverEmail = match.giver.email.trim();
    // Saved after each step, so a failure halfway (folder made, share
    // failed) is retried from where it stopped instead of making a second
    // folder.
    let folderLink = receiver.folderLink;
    let sharedWith = receiver.folderSharedWith;

    try {
      let created = false;
      if (!folderLink) {
        const folderName = `${receiver.yumeshipName} - ${receiver.fandomYume}`;
        folderLink = await createDriveFolder(folderName);
        await db.orm.public.Participant.where({ id: receiver.id }).update({ folderLink });
        created = true;
      }

      if (sharedWith?.toLowerCase() === giverEmail.toLowerCase()) {
        results[matchId] = created ? "created" : "already_done";
        continue;
      }

      // Folder still open to a giver from before a reshuffle — they're not
      // this receiver's giver anymore, so close it before opening it to the
      // new one.
      if (sharedWith) {
        await unshareFolder(folderLink, sharedWith);
        sharedWith = null;
        await db.orm.public.Participant.where({ id: receiver.id }).update({ folderSharedWith: null });
      }

      await shareFolder(folderLink, giverEmail);
      await db.orm.public.Participant.where({ id: receiver.id }).update({
        folderSharedWith: giverEmail,
      });
      results[matchId] = created ? "created" : "shared";
    } catch (err) {
      console.error("create-receiver-folder failed", receiver.id, err);
      results[matchId] = "failed";
      errors[matchId] = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({ ok: true, results, errors });
}
