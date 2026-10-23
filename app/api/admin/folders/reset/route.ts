import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trashDriveFolder } from "@/lib/drive";

export const maxDuration = 60;

// Participants handled per request; the admin page calls this repeatedly
// until `remaining` hits 0, so a big reset never runs into the time limit.
const BATCH_SIZE = 10;

// Starts receiver folders over: trashes each saved folder in Drive and
// forgets its link and sharing, so "Buat folder" makes a fresh one in the
// current GOOGLE_DRIVE_PARENT_FOLDER_ID. Covers every participant, not one
// run. Folder emails already sent point at the trashed folders, so their
// "sent" marks are cleared too, to be sent again with the new links.
export async function POST() {
  const batch = await db.orm.public.Participant
    .where((p) => p.folderLink.isNotNull())
    .limit(BATCH_SIZE)
    .all();

  const failed: string[] = [];
  for (const p of batch) {
    try {
      await trashDriveFolder(p.folderLink!);
    } catch (err) {
      // Still forget the link: a folder the app can't trash (deleted by
      // hand, moved out, ...) shouldn't block starting over.
      console.error("trash folder failed", p.id, err);
      failed.push(p.twtUser);
    }
    await db.orm.public.Participant.where({ id: p.id }).update({
      folderLink: null,
      folderSharedWith: null,
    });
    await db.orm.public.Match.where({ receiverId: p.id }).updateAll({ folderNotifiedAt: null });
  }

  const remaining = await db.orm.public.Participant
    .where((p) => p.folderLink.isNotNull())
    .aggregate((a) => ({ total: a.count() }));

  return NextResponse.json({
    ok: true,
    processed: batch.length,
    failed,
    remaining: remaining.total,
  });
}
