"use client";

import { useMemo, useState } from "react";
import type { NotifyRow } from "@/lib/notify";

export default function SendReminderEmails({
  runId,
  rows,
}: {
  runId: string;
  rows: NotifyRow[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, string> | null>(null);

  // Default-select only those who haven't submitted. Reminders can still be
  // resent to anyone manually, this just avoids nagging people who are done.
  const notSubmittedIds = useMemo(
    () => rows.filter((r) => !r.submittedAt).map((r) => r.matchId),
    [rows],
  );
  const allNotSubmittedSelected =
    notSubmittedIds.length > 0 && notSubmittedIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllNotSubmitted() {
    setSelected(allNotSubmittedSelected ? new Set() : new Set(notSubmittedIds));
  }

  async function handleSend() {
    if (selected.size === 0) return;
    setSending(true);
    setError(null);
    setLastResults(null);

    try {
      const res = await fetch(`/api/admin/matches/${runId}/notify-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim email.");
        return;
      }
      setLastResults(data.results);
      setSelected(new Set());
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          {rows.length - notSubmittedIds.length} dari {rows.length} sudah upload &middot;{" "}
          {selected.size} dipilih
        </p>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || selected.size === 0}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
        >
          {sending ? "Mengirim..." : `Kirim reminder ke ${selected.size} peserta terpilih`}
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
                  checked={allNotSubmittedSelected}
                  onChange={toggleAllNotSubmitted}
                  aria-label="Pilih semua yang belum upload"
                />
              </th>
              <th className="px-4 py-2 text-left font-medium">Giver</th>
              <th className="px-4 py-2 text-left font-medium">Email giver</th>
              <th className="px-4 py-2 text-left font-medium">Upload hadiah</th>
              <th className="px-4 py-2 text-left font-medium">Perpanjangan</th>
              <th className="px-4 py-2 text-left font-medium">Hasil kirim</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {rows.map((row) => {
              const result = lastResults?.[row.matchId];
              return (
                <tr key={row.matchId} className="text-gray-600">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.matchId)}
                      onChange={() => toggleOne(row.matchId)}
                    />
                  </td>
                  <td className="px-4 py-2">{row.giverTwt}</td>
                  <td className="px-4 py-2">{row.giverEmail}</td>
                  <td className="px-4 py-2">
                    {row.submittedAt ? (
                      <span className="text-teal-600">Sudah upload</span>
                    ) : (
                      <span className="text-amber-600">Belum upload</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {row.extensionDays ? (
                      <span className="text-teal-600" title={row.extensionReason ?? undefined}>
                        +{row.extensionDays} hari
                      </span>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {result === "sent" ? (
                      <span className="text-teal-600">Terkirim</span>
                    ) : result === "failed" ? (
                      <span className="text-red-500">Gagal, coba lagi</span>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                </tr>
              );
            })}
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
