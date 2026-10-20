"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface RemovedParticipant {
  participantId: string;
  twtUser: string;
  removedAt: string;
  formerReceiverTwt: string | null;
  formerGiverTwt: string | null;
}

interface RestoreResult {
  restoredTwt: string;
  restored: string[];
  notRestored: string[];
}

// People taken out of this run with "Hapus dari matching" (e.g. didn't
// confirm in time), with a way to put them back.
export default function RemovedParticipants({
  runId,
  removed,
}: {
  runId: string;
  removed: RemovedParticipant[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RestoreResult | null>(null);

  async function restore(participantId: string) {
    setBusyId(participantId);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/matches/${runId}/restore-participant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengembalikan.");
        return;
      }
      setResult(data);
      router.refresh();
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium text-gray-800">Dihapus dari matching ({removed.length})</h2>
      <p className="text-xs text-gray-400">
        Peserta yang dikeluarkan lewat &quot;Hapus dari matching&quot;. Mereka tidak ikut
        pasangkan manual atau solusi otomatis. &quot;Kembalikan&quot; memasang lagi pasangan lama
        mereka kalau slotnya masih kosong; kalau sudah terisi, mereka kembali sebagai No giver /
        No receiver.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {result && (
        <div className="space-y-1 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-700">
          <p className="font-medium">{result.restoredTwt} dikembalikan.</p>
          {result.restored.length > 0 && (
            <p>
              Pasangan dipulihkan (link konfirmasi #2, perlu kirim email lagi):{" "}
              {result.restored.join(", ")}
            </p>
          )}
          {result.notRestored.map((n, i) => (
            <p key={i} className="text-amber-700">
              Tidak dipulihkan: {n}.
            </p>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-teal-100 text-sm">
          <thead className="bg-teal-50 text-teal-600">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Peserta</th>
              <th className="px-4 py-2 text-left font-medium">Pasangan sebelumnya</th>
              <th className="px-4 py-2 text-left font-medium">Dihapus</th>
              <th className="px-4 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {removed.map((r) => (
              <tr key={r.participantId} className="text-gray-600">
                <td className="px-4 py-2 font-medium text-gray-800">{r.twtUser}</td>
                <td className="px-4 py-2 text-gray-500">
                  <div>Memberi ke: {r.formerReceiverTwt ?? "-"}</div>
                  <div>Diberi oleh: {r.formerGiverTwt ?? "-"}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-gray-400">{r.removedAt}</td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => restore(r.participantId)}
                    disabled={busyId !== null}
                    className="rounded-lg border border-teal-200 px-3 py-1.5 text-sm text-teal-600 hover:bg-teal-50 disabled:opacity-50"
                  >
                    {busyId === r.participantId ? "Mengembalikan..." : "Kembalikan"}
                  </button>
                </td>
              </tr>
            ))}
            {removed.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Belum ada peserta yang dihapus dari matching ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
