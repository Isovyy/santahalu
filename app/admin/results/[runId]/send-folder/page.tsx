import Link from "next/link";
import { notFound } from "next/navigation";
import { getNotifyRows } from "@/lib/notify";
import SendFolderEmails from "./SendFolderEmails";

export const dynamic = "force-dynamic";

export default async function SendFolderEmailsPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const data = await getNotifyRows(runId);
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link href={`/admin/results/${runId}`} className="text-sm text-teal-500 hover:underline">
        &larr; Back to results
      </Link>

      <h1 className="mt-3 text-3xl font-bold text-teal-500">Kirim link folder</h1>
      <p className="mt-1 text-sm text-gray-500">
        Email ini hanya berisi link folder Drive untuk upload hadiah. Baris tanpa link folder
        tidak bisa dikirim &mdash; isi dulu link foldernya di halaman{" "}
        <Link href="/admin/responses" className="text-teal-500 hover:underline">
          Semua Jawaban
        </Link>
        .
      </p>

      <div className="mt-6">
        <SendFolderEmails runId={runId} rows={data.rows} />
      </div>
    </main>
  );
}
