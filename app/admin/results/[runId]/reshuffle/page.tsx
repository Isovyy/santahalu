import Link from "next/link";
import { notFound } from "next/navigation";
import { getNotifyRows } from "@/lib/notify";
import ReshuffleMatches from "./ReshuffleMatches";

export const dynamic = "force-dynamic";

export default async function ReshufflePage({
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

      <h1 className="mt-3 text-3xl font-bold text-teal-500">Reshuffle pasangan</h1>
      <p className="mt-1 text-sm text-gray-500">
        Pilih pasangan yang perlu dipasangkan ulang (yang melapor masalah sudah tercentang
        otomatis). Kalau tidak ada kandidat yang cocok di dalam pilihan, tambahkan pasangan lain
        supaya ada lebih banyak opsi. Pasangan yang berhasil direshuffle akan direset statusnya
        dan perlu dikirim ulang email pasangannya.
      </p>

      <div className="mt-6">
        <ReshuffleMatches runId={runId} rows={data.rows} />
      </div>
    </main>
  );
}
