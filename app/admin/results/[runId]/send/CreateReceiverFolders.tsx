"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotifyRow } from "@/lib/notify";

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

    try {
      const res = await fetch(`/api/admin/matches/${runId}/create-receiver-folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchIds: Array.from(selected) }),
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
          `Gagal membuat folder (HTTP ${res.status}): ${data.error || text.slice(0, 200) || "tanpa keterangan"}`,
        );
        return;
      }
      setLastResults(data.results ?? {});
      setRowErrors(data.errors ?? {});
      setSelected(new Set());
      router.refresh();
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setCreating(false);
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
          {creating ? "Memproses..." : `Buat folder & bagikan akses (${selected.size})`}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

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
