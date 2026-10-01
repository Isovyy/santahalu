import Link from "next/link";
import { db } from "@/lib/db";
import CreateFolders, { type FolderRow } from "./CreateFolders";

export const dynamic = "force-dynamic";

export default async function DriveFoldersPage() {
  const participants = await db.orm.public.Participant
    .orderBy((p) => p.twtUser.asc())
    .all();

  const rows: FolderRow[] = participants.map((p) => ({
    id: p.id,
    twtUser: p.twtUser,
    fandomYume: p.fandomYume,
    folderLink: p.folderLink,
  }));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <Link href="/admin" className="text-sm text-teal-500 hover:underline">
        &larr; Back to admin
      </Link>

      <h1 className="mt-3 text-3xl font-bold text-teal-500">Buat folder Drive</h1>
      <p className="mt-1 text-sm text-gray-500">
        Membuat folder otomatis di dalam Drive bersama (iniyumefess), satu folder per peserta
        bernama &quot;username - fandom&quot;. Link foldernya langsung tersimpan ke jawaban
        peserta, dipakai saat kirim link folder nanti.
      </p>

      <div className="mt-6">
        <CreateFolders rows={rows} />
      </div>
    </main>
  );
}
