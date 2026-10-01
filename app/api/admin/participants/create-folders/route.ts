import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createDriveFolder } from "@/lib/drive";

type CreateOutcome = "created" | "already_has_folder" | "not_found" | "failed";

export async function POST(req: NextRequest) {
  let body: { participantIds?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine, means "all participants missing a folder"
  }

  const requestedIds = Array.isArray(body.participantIds)
    ? body.participantIds.filter((id): id is string => typeof id === "string")
    : null;

  const participants = requestedIds
    ? await Promise.all(requestedIds.map((id) => db.orm.public.Participant.first({ id })))
    : await db.orm.public.Participant.where((p) => p.folderLink.isNull()).all();

  const results: Record<string, CreateOutcome> = {};

  for (const participant of participants) {
    if (!participant) continue;
    if (requestedIds && participant.folderLink) {
      results[participant.id] = "already_has_folder";
      continue;
    }
    try {
      const folderName = `${participant.twtUser} - ${participant.fandomYume}`;
      const link = await createDriveFolder(folderName);
      await db.orm.public.Participant.where({ id: participant.id }).update({ folderLink: link });
      results[participant.id] = "created";
    } catch (err) {
      console.error("create-folder failed", participant.id, err);
      results[participant.id] = "failed";
    }
  }

  return NextResponse.json({ ok: true, results });
}
