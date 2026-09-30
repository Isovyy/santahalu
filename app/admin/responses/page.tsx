import Link from "next/link";
import { db } from "@/lib/db";
import LogoutButton from "../LogoutButton";
import ResponsesView from "./ResponsesView";
import type { ParticipantRow } from "./fields";

export const dynamic = "force-dynamic";

export default async function ResponsesPage() {
  const participants = await db.orm.public.Participant.orderBy((p) => p.createdAt.asc()).all();

  const rows: ParticipantRow[] = participants.map((p) => ({
    id: p.id,
    // DateTime is a Temporal.Instant; toString() is ISO 8601 (serialisable to the client view).
    createdAt: p.createdAt.toString(),
    email: p.email,
    twtUser: p.twtUser,
    yumeshipName: p.yumeshipName,
    oshiName: p.oshiName,
    relationshipType: p.relationshipType,
    fandomYume: p.fandomYume,
    contentType: p.contentType,
    languageReceive: p.languageReceive,
    languageGive: p.languageGive ?? "",
    fandomGive: p.fandomGive,
    yumeTypeReceive: p.yumeTypeReceive ?? "",
    yumeDocuLink: p.yumeDocuLink,
    notes: p.notes ?? "",
    avoidList: p.avoidList ?? "",
    folderLink: p.folderLink ?? "",
  }));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="text-sm text-teal-500 hover:underline">
          &larr; Back to admin
        </Link>
        <LogoutButton />
      </div>

      <ResponsesView participants={rows} />
    </main>
  );
}
