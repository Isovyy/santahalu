import Link from "next/link";
import { notFound } from "next/navigation";
import { getNotifyRows } from "@/lib/notify";
import SendMatchEmails from "./SendMatchEmails";

export const dynamic = "force-dynamic";

export default async function SendMatchEmailsPage({
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

      <h1 className="mt-3 text-3xl font-bold text-teal-500">Kirim email pasangan</h1>
      <p className="mt-1 text-sm text-gray-500">
        Setiap giver akan menerima email berisi info penerima (fandom, oshi, karakter yang
        dihindari). Link folder untuk upload hadiah dikirim terpisah, lewat{" "}
        <Link href={`/admin/results/${runId}/send-folder`} className="text-teal-500 hover:underline">
          Kirim link folder
        </Link>
        , setelah foldernya siap.
      </p>

      <div className="mt-6">
        <SendMatchEmails runId={runId} rows={data.rows} />
      </div>
    </main>
  );
}
