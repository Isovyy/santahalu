"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotifyRow } from "@/lib/notify";

// Pairs per request — small enough to finish well inside the time limit.
const FOLDER_BATCH_SIZE = 5;

// Done = folder exists AND the current giver is the one with access to it.
// A folder shared with someone else is left over from before a reshuffle.
function accessState(row: NotifyRow): "none" | "current" | "old_giver" {
  if (!row.receiverFolderSharedWith) return "none";
  return row.receiverFolderSharedWith.toLowerCase() === row.giverEmail.trim().toLowerCase()
    ? "current"
    : "old_giver";
}

function needsAction(row: NotifyRow): boolean {
  return !row.receiverFolderLink || accessState(row) !== "current";
}

export default function CreateReceiverFolders({
  runId,
  rows,
}: {
  runId: string;
  rows: NotifyRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(rows.filter(needsAction).map((r) => r.matchId)),
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, string> | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const eligibleIds = useMemo(() => rows.filter(needsAction).map((r) => r.matchId), [rows]);
  const allEligibleSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllEligible() {
    setSelected(allEligibleSelected ? new Set() : new Set(eligibleIds));
  }

  async function handleCreate() {
    if (selected.size === 0) return;
    setCreating(true);
    setError(null);
    setLastResults(null);

    // Each folder means several Drive API calls, so a big selection in one
    // request runs past Vercel's function time limit (HTTP 504). Send small
    // batches one after another instead; whatever finished is kept even if a
    // later batch fails.
    const ids = Array.from(selected);
    const results: Record<string, string> = {};
    const errors: Record<string, string> = {};
    setProgress({ done: 0, total: ids.length });

    try {
      for (let i = 0; i < ids.length; i += FOLDER_BATCH_SIZE) {
        const batch = ids.slice(i, i + FOLDER_BATCH_SIZE);
        const res = await fetch(`/api/admin/matches/${runId}/create-receiver-folders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchIds: batch }),
        });
        // Read as text first: a crashed or timed-out request comes back as an
        // HTML/plain-text error page, not JSON, and its body is the only clue.
        const text = await res.text();
        let data: { error?: string; results?: Record<string, string>; errors?: Record<string, string> } = {};
        try {
          data = JSON.parse(text);
        } catch {
          // not JSON, fall through with the raw text below
        }
        if (!res.ok) {
          setError(
            `Gagal membuat folder (HTTP ${res.status}) setelah ${i} dari ${ids.length}: ${data.error || text.slice(0, 200) || "tanpa keterangan"}. Yang sudah selesai tetap tersimpan, klik lagi untuk melanjutkan.`,
          );
          break;
        }
        Object.assign(results, data.results ?? {});
        Object.assign(errors, data.errors ?? {});
        setProgress({ done: Math.min(i + batch.length, ids.length), total: ids.length });
      }
      setLastResults(results);
      setRowErrors(errors);
      setSelected(new Set());
      router.refresh();
    } catch {
      setError("Network error, coba lagi. Yang sudah selesai tetap tersimpan.");
      setLastResults(results);
      setRowErrors(errors);
      router.refresh();
    } finally {
      setCreating(false);
      setProgress(null);
    }
  }

  const doneCount = rows.filter((r) => !needsAction(r)).length;

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        Hanya menampilkan receiver yang givernya sudah konfirmasi pasangannya di hasil matching
        ini ({rows.length} dari peserta yang dikonfirmasi). Folder dibuat bila belum ada, lalu
        email terdaftar giver diberi akses edit. Bila folder masih dibagikan ke giver lama
        (sebelum reshuffle), aksesnya dicabut dulu.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          {doneCount} dari {rows.length} sudah punya folder &amp; akses giver &middot;{" "}
          {selected.size} dipilih
        </p>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || selected.size === 0}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
        >
          {creating
            ? `Memproses ${progress?.done ?? 0}/${progress?.total ?? selected.size}...`
            : `Buat folder & bagikan akses (${selected.size})`}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <ResetAllFolders onDone={() => router.refresh()} />

      <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-teal-100 text-sm">
          <thead className="bg-teal-50 text-teal-600">
            <tr>
              <th className="px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allEligibleSelected}
                  onChange={toggleAllEligible}
                  aria-label="Pilih semua yang belum selesai"
                />
              </th>
              <th className="px-4 py-2 text-left font-medium">Receiver</th>
              <th className="px-4 py-2 text-left font-medium">Oshi &amp; fandom</th>
              <th className="px-4 py-2 text-left font-medium">Folder</th>
              <th className="px-4 py-2 text-left font-medium">Akses giver</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {rows.map((row) => {
              const folderLink = row.receiverFolderLink;
              const result = lastResults?.[row.matchId];
              const access = accessState(row);
              return (
                <tr key={row.matchId} className="text-gray-600">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.matchId)}
                      disabled={!needsAction(row)}
                      onChange={() => toggleOne(row.matchId)}
                    />
                  </td>
                  <td className="px-4 py-2">{row.receiverTwt}</td>
                  <td className="px-4 py-2">
                    {row.receiverOshiName} &middot; {row.receiverFandomYume}
                  </td>
                  <td className="px-4 py-2">
                    {folderLink ? (
                      <a
                        href={folderLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-500 hover:underline"
                      >
                        Buka folder
                      </a>
                    ) : (
                      <span className="text-gray-400">Belum ada</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {result === "failed" ? (
                      <span className="text-red-500">
                        Gagal, coba lagi
                        {rowErrors[row.matchId] && (
                          <span className="block text-xs">{rowErrors[row.matchId]}</span>
                        )}
                      </span>
                    ) : access === "current" ? (
                      <span className="text-teal-600">
                        {row.giverTwt}
                        <span className="block text-xs text-gray-400">{row.receiverFolderSharedWith}</span>
                      </span>
                    ) : access === "old_giver" ? (
                      <span className="text-amber-600">
                        Masih giver lama
                        <span className="block text-xs">{row.receiverFolderSharedWith}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">Belum dibagikan</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Belum ada yang konfirmasi pada hasil matching ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Starts every receiver folder over (all participants, not just this tab's
// rows): trashes the old folders and forgets their links, so "Buat folder"
// makes fresh ones in the current parent folder. Runs in small batches until
// nothing is left, for the same time-limit reason as folder creation.
function ResetAllFolders({ onDone }: { onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (
      !window.confirm(
        "Hapus SEMUA folder receiver yang sudah dibuat dan reset link-nya?\n\n" +
          "- Folder lama dipindah ke trash (Drive service account, bisa dipulihkan ~30 hari).\n" +
          "- Giver kehilangan akses ke folder lama.\n" +
          "- Status 'email folder terkirim' direset, jadi email folder perlu dikirim ulang.\n\n" +
          "Setelah ini klik 'Buat folder' untuk membuat folder baru di parent folder yang sekarang.",
      )
    ) {
      return;
    }
    setRunning(true);
    setError(null);
    let done = 0;
    const failed: string[] = [];
    try {
      for (;;) {
        const res = await fetch("/api/admin/folders/reset", { method: "POST" });
        const text = await res.text();
        let data: { error?: string; processed?: number; remaining?: number; failed?: string[] } = {};
        try {
          data = JSON.parse(text);
        } catch {
          // not JSON, reported below
        }
        if (!res.ok) {
          setError(
            `Gagal reset (HTTP ${res.status}) setelah ${done} folder: ${data.error || text.slice(0, 200) || "tanpa keterangan"}. Klik lagi untuk melanjutkan.`,
          );
          break;
        }
        done += data.processed ?? 0;
        failed.push(...(data.failed ?? []));
        setStatus(`Mereset... ${done} folder, sisa ${data.remaining ?? 0}`);
        if (!data.remaining || !data.processed) break;
      }
      setStatus(
        `${done} folder direset.` +
          (failed.length
            ? ` ${failed.length} tidak bisa dihapus dari Drive (link tetap dilupakan): ${failed.join(", ")}.`
            : ""),
      );
    } catch {
      setError(`Network error setelah ${done} folder. Klik lagi untuk melanjutkan.`);
    } finally {
      setRunning(false);
      onDone();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
      >
        {running ? "Mereset..." : "Hapus & reset semua folder"}
      </button>
      <span className="text-xs text-red-700">
        Untuk mulai ulang folder di parent folder baru. Semua peserta, bukan cuma tabel ini.
      </span>
      {status && <span className="w-full text-red-700">{status}</span>}
      {error && <span className="w-full text-red-600">{error}</span>}
    </div>
  );
}
