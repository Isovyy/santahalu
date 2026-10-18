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
  seed: number;
  dryRun: boolean;
  poolSize: number;
  matched: number;
  unmatched: number;
  resolved: ResolvedPairing[];
  unresolved: { id: string; twtUser: string }[];
  blocked: { giverTwt: string; wouldBeReceiverTwt: string }[];
  orphaned: { giverTwt: string; formerReceiverTwt: string }[];
  rulesVerified: boolean;
}

interface RemoveResult {
  removedTwt: string;
  formerReceiverTwt: string | null;
  formerGiverTwt: string | null;
}

interface AutoStep {
  giverTwt: string;
  previousReceiverTwt: string | null;
  newReceiverTwt: string;
  newReceiverOshiName: string;
  newReceiverFandomYume: string;
  wasConfirmed: boolean;
}

interface AutoChain {
  stuckGiverTwt: string;
  steps: AutoStep[];
}

interface AutoResult {
  dryRun: boolean;
  chains: AutoChain[];
  unresolvable: string[];
  blocked: { giverTwt: string; wouldBeReceiverTwt: string }[];
}

export default function ReshuffleMatches({
  runId,
  rows,
  ruleBreakingMatchIds,
}: {
  runId: string;
  rows: NotifyRow[];
  ruleBreakingMatchIds: string[];
}) {
  const ruleBreaking = new Set(ruleBreakingMatchIds);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  // Filtering only hides rows; ticked pairs stay selected while hidden.
  const visibleRows = q
    ? rows.filter((r) =>
        [r.giverTwt, r.giverEmail, r.receiverTwt, r.receiverEmail, r.receiverOshiName, r.receiverFandomYume]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : rows;
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(rows.filter((r) => r.reportedAt).map((r) => r.matchId)),
  );
  const [seed, setSeed] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReshuffleResult | null>(null);
  const [removeResult, setRemoveResult] = useState<RemoveResult | null>(null);
  const [autoResult, setAutoResult] = useState<AutoResult | null>(null);
  const [autoGiverIds, setAutoGiverIds] = useState<string[]>([]);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleRemoved(matchId: string, removed: RemoveResult) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(matchId);
      return next;
    });
    setRemoveResult(removed);
    router.refresh();
  }

  async function runReshuffle(dryRun: boolean) {
    if (selected.size < 2) {
      setError("Pilih minimal 2 pasangan untuk di-reshuffle.");
      return;
    }
    setRunning(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/matches/${runId}/reshuffle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchIds: Array.from(selected),
          seed: seed.trim() ? Number(seed) : undefined,
          dryRun,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal reshuffle.");
        return;
      }
      setResult(data);
      // Pin the seed actually used (including a freshly-rolled random one),
      // so re-clicking Preview tries again fresh but Terapkan right after a
      // preview reproduces exactly what was shown.
      setSeed(String(data.seed));
      if (!dryRun) router.refresh();
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setRunning(false);
    }
  }

  async function runAuto(giverIds: string[], dryRun: boolean) {
    setAutoRunning(true);
    setAutoError(null);
    setAutoGiverIds(giverIds);

    try {
      const res = await fetch(`/api/admin/matches/${runId}/reshuffle/auto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giverIds, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAutoError(data.error || "Gagal mencari solusi otomatis.");
        return;
      }
      setAutoResult(data);
      if (!dryRun) router.refresh();
    } catch {
      setAutoError("Network error, coba lagi.");
    } finally {
      setAutoRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          {selected.size} dipilih &middot; pasangan yang melapor masalah sudah dicentang
          otomatis, tambahkan pasangan lain kalau perlu lebih banyak opsi.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Seed
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="acak"
              className="w-20 rounded-lg border border-teal-200 px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </label>
          <button
            type="button"
            onClick={() => runReshuffle(true)}
            disabled={running || selected.size < 2}
            className="rounded-lg border border-teal-200 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 disabled:opacity-50"
          >
            {running ? "Mencoba..." : "Coba dulu (preview)"}
          </button>
          <button
            type="button"
            onClick={() => runReshuffle(false)}
            disabled={running || selected.size < 2}
            className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
          >
            {running ? "Mereshuffle..." : `Reshuffle ${selected.size} pasangan`}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Seed sama + pasangan terpilih sama = hasil yang sama. &quot;Coba dulu&quot; cuma
        menampilkan hasilnya, tidak disimpan sampai klik Reshuffle.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {removeResult && (
        <div className="space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-medium">{removeResult.removedTwt} dihapus dari matching ini.</p>
          <ul className="list-disc space-y-1 pl-5">
            {removeResult.formerReceiverTwt && (
              <li>{removeResult.formerReceiverTwt} sekarang butuh giver baru (No giver).</li>
            )}
            {removeResult.formerGiverTwt && (
              <li>{removeResult.formerGiverTwt} sekarang butuh receiver baru (No receiver).</li>
            )}
          </ul>
        </div>
      )}

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

      {result && result.orphaned.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">
            {result.orphaned.length} giver kehilangan receiver-nya (direbut pasangan lain di
            batch ini, tapi mereka sendiri tidak dapat pasangan baru) &mdash; pasangannya dihapus
            supaya tidak ada receiver yang punya 2 giver sekaligus. Mereka sekarang butuh
            reshuffle lagi:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {result.orphaned.map((o, i) => (
              <li key={i}>
                {o.giverTwt} (sebelumnya &rarr; {o.formerReceiverTwt})
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div
          className={`space-y-3 rounded-2xl border p-4 text-sm ${
            result.dryRun
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-teal-100 bg-teal-50 text-teal-700"
          }`}
        >
          <p className="font-medium">
            {result.dryRun
              ? `Preview (seed ${result.seed}), belum disimpan.`
              : `Tersimpan (seed ${result.seed}).`}
          </p>
          <p>
            {result.matched} dari {result.poolSize} berhasil dipasangkan ulang.{" "}
            {result.dryRun
              ? "Klik Reshuffle dengan seed yang sama di atas untuk menyimpan hasil ini."
              : "Semua yang berhasil sudah direset statusnya (perlu kirim email pasangan lagi)."}
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
            <div className="space-y-2">
              <p className="text-amber-700">
                {result.unresolved.length} tidak bisa dipasangkan (tidak ada kandidat yang cocok):{" "}
                {result.unresolved.map((u) => u.twtUser).join(", ")}. Coba tambahkan lebih banyak
                pasangan ke pilihan lalu reshuffle lagi, atau cari solusi otomatis di bawah.
              </p>
              <button
                type="button"
                onClick={() => runAuto(result.unresolved.map((u) => u.id), true)}
                disabled={autoRunning}
                className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 disabled:opacity-50"
              >
                {autoRunning ? "Mencari..." : "Cari solusi otomatis"}
              </button>
            </div>
          )}
        </div>
      )}

      {autoError && <p className="text-sm text-red-500">{autoError}</p>}

      {autoResult && (
        <div
          className={`space-y-3 rounded-2xl border p-4 text-sm ${
            autoResult.dryRun
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-teal-100 bg-teal-50 text-teal-700"
          }`}
        >
          <p className="font-medium">
            {autoResult.dryRun
              ? "Preview solusi otomatis, belum disimpan."
              : "Solusi otomatis diterapkan dan tersimpan."}
          </p>

          {autoResult.chains.length === 0 && autoResult.unresolvable.length === 0 && (
            <p>Tidak ada yang perlu diselesaikan.</p>
          )}

          {autoResult.chains.map((chain, i) => (
            <div key={i} className="rounded-lg bg-white p-3">
              <p className="font-medium text-gray-700">
                Solusi untuk {chain.stuckGiverTwt} ({chain.steps.length} langkah):
              </p>
              <ul className="mt-2 divide-y divide-teal-100">
                {chain.steps.map((step, j) => (
                  <li key={j} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="font-medium text-gray-700">{step.giverTwt}</span>
                    <span className="text-gray-500">
                      {step.previousReceiverTwt ?? "(belum punya pasangan)"} &rarr;{" "}
                      <span className="font-medium text-teal-700">{step.newReceiverTwt}</span> (
                      {step.newReceiverFandomYume} &middot; {step.newReceiverOshiName})
                    </span>
                    {step.wasConfirmed && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        ⚠ Memutus pasangan yang sudah dikonfirmasi
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {autoResult.unresolvable.length > 0 && (
            <p className="text-amber-700">
              Tidak ada solusi sama sekali untuk: {autoResult.unresolvable.join(", ")} &mdash;
              bahkan dengan membongkar pasangan lain.
            </p>
          )}

          {autoResult.dryRun && autoResult.chains.length > 0 && (
            <button
              type="button"
              onClick={() => runAuto(autoGiverIds, false)}
              disabled={autoRunning}
              className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
            >
              {autoRunning ? "Menerapkan..." : "Terapkan semua"}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari username, email, oshi, atau fandom..."
          className="w-full max-w-sm rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-300"
        />
        {q && (
          <span className="text-sm text-gray-500">
            {visibleRows.length} dari {rows.length} pasangan
          </span>
        )}
      </div>

      {/* Mobile: stacked cards, no horizontal scroll needed. */}
      <div className="space-y-2 sm:hidden">
        {visibleRows.map((row) => (
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
                {ruleBreaking.has(row.matchId) && <RuleBreakingBadge />}
              </p>
              {row.reportNote && (
                <p className="mt-1 break-words text-gray-500">Catatan: {row.reportNote}</p>
              )}
              <div className="mt-2">
                <RemoveButton
                  runId={runId}
                  matchId={row.matchId}
                  giverTwt={row.giverTwt}
                  onRemoved={(r) => handleRemoved(row.matchId, r)}
                />
              </div>
            </div>
          </label>
        ))}
        {visibleRows.length === 0 && (
          <p className="rounded-2xl border border-teal-100 bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
            {q ? "Tidak ada pasangan yang cocok dengan pencarian." : "Tidak ada pasangan pada hasil matching ini."}
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
              <th className="px-4 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {visibleRows.map((row) => (
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
                  {ruleBreaking.has(row.matchId) && <RuleBreakingBadge />}
                </td>
                <td className="max-w-[16rem] break-words px-4 py-2 text-gray-500">
                  {row.reportNote || "-"}
                </td>
                <td className="px-4 py-2">
                  <RemoveButton
                    runId={runId}
                    matchId={row.matchId}
                    giverTwt={row.giverTwt}
                    onRemoved={(r) => handleRemoved(row.matchId, r)}
                  />
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  {q ? "Tidak ada pasangan yang cocok dengan pencarian." : "Tidak ada pasangan pada hasil matching ini."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Pair doesn't satisfy the matching rules against current answers: forced by
// hand, or broken by an edit after matching.
function RuleBreakingBadge() {
  return (
    <span className="ml-2 whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
      ⚠ Melanggar aturan
    </span>
  );
}

function StatusBadge({ row }: { row: NotifyRow }) {
  if (row.reportedAt) return <span className="text-amber-600">Lapor masalah</span>;
  if (row.confirmedAt) return <span className="text-teal-600">Dikonfirmasi</span>;
  return <span className="text-gray-400">Belum konfirmasi</span>;
}

// Removes this row's giver from the match run entirely (both the giving and
// receiving side), without running any rematching — for someone who's gone
// unresponsive. Their former receiver/giver fall into the No giver / No
// receiver pools shown on the results page, to be reshuffled whenever there's
// enough of a pool.
function RemoveButton({
  runId,
  matchId,
  giverTwt,
  onRemoved,
}: {
  runId: string;
  matchId: string;
  giverTwt: string;
  onRemoved: (result: RemoveResult) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${runId}/remove-participant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menghapus.");
        setRemoving(false);
        return;
      }
      onRemoved(data);
    } catch {
      setError("Network error, coba lagi.");
      setRemoving(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-red-600">Hapus {giverTwt} dari matching?</span>
        <button
          type="button"
          onClick={remove}
          disabled={removing}
          className="rounded-lg bg-red-500 px-2 py-1 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
        >
          {removing ? "Menghapus..." : "Ya, hapus"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(false);
          }}
          disabled={removing}
          className="rounded-lg border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50"
        >
          Batal
        </button>
        {error && <span className="text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirming(true);
      }}
      className="text-xs text-red-500 hover:underline"
    >
      Hapus dari matching
    </button>
  );
}
