"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NotifyRow } from "@/lib/notify";

interface ResolvedPairing {
  giverTwt: string;
  previousReceiverTwt: string;
  newReceiverTwt: string;
  newReceiverOshiName: string;
  newReceiverFandomYume: string;
}

interface ReshuffleResult {
  poolSize: number;
  matched: number;
  unmatched: number;
  resolved: ResolvedPairing[];
  unresolved: { id: string; twtUser: string }[];
  blocked: { giverTwt: string; wouldBeReceiverTwt: string }[];
  rulesVerified: boolean;
}

export default function ReshuffleMatches({
  runId,
  rows,
}: {
  runId: string;
  rows: NotifyRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(rows.filter((r) => r.reportedAt).map((r) => r.matchId)),
  );
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReshuffleResult | null>(null);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleReshuffle() {
    if (selected.size < 2) {
      setError("Pilih minimal 2 pasangan untuk di-reshuffle.");
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/admin/matches/${runId}/reshuffle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal reshuffle.");
        return;
      }
      setResult(data);
      router.refresh();
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          {selected.size} dipilih &middot; pasangan yang melapor masalah sudah dicentang
          otomatis, tambahkan pasangan lain kalau perlu lebih banyak opsi.
        </p>
        <button
          type="button"
          onClick={handleReshuffle}
          disabled={running || selected.size < 2}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
        >
          {running ? "Mereshuffle..." : `Reshuffle ${selected.size} pasangan`}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && result.blocked.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">
            {result.blocked.length} pasangan DIBATALKAN karena melanggar aturan matching (bug,
            tolong laporkan), tidak disimpan ke database:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {result.blocked.map((b, i) => (
              <li key={i}>
                {b.giverTwt} &rarr; {b.wouldBeReceiverTwt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-700">
          <p>
            {result.matched} dari {result.poolSize} berhasil dipasangkan ulang. Semua yang
            berhasil sudah direset statusnya (perlu kirim email pasangan lagi).
          </p>
          {result.resolved.length > 0 && (
            <>
              <p className="text-xs text-teal-600">
                Setiap pasangan di bawah sudah diverifikasi ulang terhadap semua aturan (oshi,
                bahasa, fandom, avoid list) sebelum disimpan.
              </p>
              <ul className="divide-y divide-teal-200 rounded-lg bg-white">
                {result.resolved.map((p, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 p-2">
                    <span className="font-medium text-gray-700">{p.giverTwt}</span>
                    <span className="text-gray-500">
                      {p.previousReceiverTwt} &rarr;{" "}
                      <span className="font-medium text-teal-700">{p.newReceiverTwt}</span> (
                      {p.newReceiverFandomYume} &middot; {p.newReceiverOshiName})
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {result.unresolved.length > 0 && (
            <p className="text-amber-700">
              {result.unresolved.length} tidak bisa dipasangkan (tidak ada kandidat yang cocok):{" "}
              {result.unresolved.map((u) => u.twtUser).join(", ")}. Coba tambahkan lebih banyak
              pasangan ke pilihan lalu reshuffle lagi.
            </p>
          )}
        </div>
      )}

      {/* Mobile: stacked cards, no horizontal scroll needed. */}
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <label
            key={row.matchId}
            className="flex gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm"
          >
            <input
              type="checkbox"
              checked={selected.has(row.matchId)}
              onChange={() => toggleOne(row.matchId)}
              className="mt-1"
            />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-gray-800">
                {row.giverTwt} &rarr; {row.receiverTwt}
              </p>
              <p className="mt-1 text-gray-500">
                {row.receiverFandomYume} &middot; {row.receiverOshiName}
              </p>
              <p className="mt-1">
                <StatusBadge row={row} />
              </p>
              {row.reportNote && (
                <p className="mt-1 break-words text-gray-500">Catatan: {row.reportNote}</p>
              )}
            </div>
          </label>
        ))}
        {rows.length === 0 && (
          <p className="rounded-2xl border border-teal-100 bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
            Tidak ada pasangan pada hasil matching ini.
          </p>
        )}
      </div>

      {/* Desktop/tablet: full table. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm sm:block">
        <table className="min-w-full divide-y divide-teal-100 text-sm">
          <thead className="bg-teal-50 text-teal-600">
            <tr>
              <th className="px-4 py-2 text-left"></th>
              <th className="px-4 py-2 text-left font-medium">Giver</th>
              <th className="px-4 py-2 text-left font-medium">Untuk (receiver)</th>
              <th className="px-4 py-2 text-left font-medium">Fandom &amp; oshi</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {rows.map((row) => (
              <tr key={row.matchId} className="text-gray-600">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(row.matchId)}
                    onChange={() => toggleOne(row.matchId)}
                  />
                </td>
                <td className="px-4 py-2">{row.giverTwt}</td>
                <td className="px-4 py-2">{row.receiverTwt}</td>
                <td className="px-4 py-2">
                  {row.receiverFandomYume} &middot; {row.receiverOshiName}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge row={row} />
                </td>
                <td className="max-w-[16rem] break-words px-4 py-2 text-gray-500">
                  {row.reportNote || "-"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Tidak ada pasangan pada hasil matching ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ row }: { row: NotifyRow }) {
  if (row.reportedAt) return <span className="text-amber-600">Lapor masalah</span>;
  if (row.confirmedAt) return <span className="text-teal-600">Dikonfirmasi</span>;
  return <span className="text-gray-400">Belum konfirmasi</span>;
}
