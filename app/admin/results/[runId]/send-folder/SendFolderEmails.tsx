"use client";

import { useMemo, useState } from "react";
import type { NotifyRow } from "@/lib/notify";

function formatSentAt(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

export default function SendFolderEmails({
  runId,
  rows,
}: {
  runId: string;
  rows: NotifyRow[];
}) {
  const [sentState, setSentState] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(rows.map((r) => [r.matchId, r.folderNotifiedAt])),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, string> | null>(null);

  const eligibleIds = useMemo(
    () => rows.filter((r) => r.receiverFolderLink && !sentState[r.matchId]).map((r) => r.matchId),
    [rows, sentState],
  );
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

  async function handleSend() {
    if (selected.size === 0) return;
    setSending(true);
    setError(null);
    setLastResults(null);

    try {
      const res = await fetch(`/api/admin/matches/${runId}/notify-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim email.");
        setSending(false);
        return;
      }
      const results: Record<string, string> = data.results;
      setLastResults(results);
      setSentState((prev) => {
        const next = { ...prev };
        const now = new Date().toISOString();
        for (const [id, outcome] of Object.entries(results)) {
          if (outcome === "sent") next[id] = now;
        }
        return next;
      });
      setSelected(new Set());
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setSending(false);
    }
  }

  const sentCount = rows.filter((r) => sentState[r.matchId]).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          {sentCount} dari {rows.length} sudah terkirim &middot; {selected.size} dipilih
        </p>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || selected.size === 0}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
        >
          {sending ? "Mengirim..." : `Kirim ke ${selected.size} peserta terpilih`}
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
                  aria-label="Pilih semua yang belum terkirim"
                />
              </th>
              <th className="px-4 py-2 text-left font-medium">Giver</th>
              <th className="px-4 py-2 text-left font-medium">Email giver</th>
              <th className="px-4 py-2 text-left font-medium">Untuk (receiver)</th>
              <th className="px-4 py-2 text-left font-medium">Folder link</th>
              <th className="px-4 py-2 text-left font-medium">Status kirim</th>
              <th className="px-4 py-2 text-left font-medium">Upload hadiah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {rows.map((row) => {
              const sent = sentState[row.matchId];
              const hasFolder = Boolean(row.receiverFolderLink);
              const result = lastResults?.[row.matchId];
              return (
                <tr key={row.matchId} className="text-gray-600">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.matchId)}
                      disabled={!hasFolder || Boolean(sent)}
                      onChange={() => toggleOne(row.matchId)}
                    />
                  </td>
                  <td className="px-4 py-2">{row.giverTwt}</td>
                  <td className="px-4 py-2">{row.giverEmail}</td>
                  <td className="px-4 py-2">{row.receiverTwt}</td>
                  <td className="px-4 py-2">
                    {hasFolder ? (
                      <a
                        href={row.receiverFolderLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-500 hover:underline"
                      >
                        Buka folder
                      </a>
                    ) : (
                      <span className="text-amber-600">Belum diisi</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {sent ? (
                      <span className="text-teal-600">Terkirim {formatSentAt(sent)}</span>
                    ) : result === "failed" ? (
                      <span className="text-red-500">Gagal, coba lagi</span>
                    ) : (
                      <span className="text-gray-400">Belum dikirim</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {row.submittedAt ? (
                      <span className="text-teal-600">Sudah upload {formatSentAt(row.submittedAt)}</span>
                    ) : (
                      <span className="text-gray-400">Belum upload</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
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
