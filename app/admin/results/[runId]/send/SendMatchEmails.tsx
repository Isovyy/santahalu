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

export default function SendMatchEmails({
  runId,
  rows,
}: {
  runId: string;
  rows: NotifyRow[];
}) {
  const [sentState, setSentState] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(rows.map((r) => [r.matchId, r.notifiedAt])),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, string> | null>(null);
  const [unmarkingId, setUnmarkingId] = useState<string | null>(null);

  const eligibleIds = useMemo(
    () => rows.filter((r) => !sentState[r.matchId]).map((r) => r.matchId),
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
      const res = await fetch(`/api/admin/matches/${runId}/notify`, {
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

  async function markUnsent(matchId: string) {
    setUnmarkingId(matchId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${runId}/mark-unsent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengubah status.");
        return;
      }
      setSentState((prev) => ({ ...prev, [matchId]: null }));
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setUnmarkingId(null);
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
              <th className="px-4 py-2 text-left font-medium">Fandom &amp; oshi</th>
              <th className="px-4 py-2 text-left font-medium">Yume type</th>
              <th className="px-4 py-2 text-left font-medium">Status kirim</th>
              <th className="px-4 py-2 text-left font-medium">Konfirmasi giver</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {rows.map((row) => {
              const sent = sentState[row.matchId];
              const result = lastResults?.[row.matchId];
              return (
                <tr key={row.matchId} className="text-gray-600">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.matchId)}
                      disabled={Boolean(sent)}
                      onChange={() => toggleOne(row.matchId)}
                    />
                  </td>
                  <td className="px-4 py-2">{row.giverTwt}</td>
                  <td className="px-4 py-2">{row.giverEmail}</td>
                  <td className="px-4 py-2">{row.receiverTwt}</td>
                  <td className="px-4 py-2">
                    {row.receiverFandomYume} &middot; {row.receiverOshiName}
                  </td>
                  <td className="px-4 py-2">{row.receiverRelationshipType}</td>
                  <td className="px-4 py-2">
                    {sent ? (
                      <div className="space-y-0.5">
                        <span className="text-teal-600">Terkirim {formatSentAt(sent)}</span>
                        <button
                          type="button"
                          onClick={() => markUnsent(row.matchId)}
                          disabled={unmarkingId !== null}
                          className="block text-xs text-gray-500 hover:text-teal-600 hover:underline disabled:opacity-50"
                        >
                          {unmarkingId === row.matchId ? "Mengubah..." : "Tandai belum dikirim"}
                        </button>
                      </div>
                    ) : result === "failed" ? (
                      <span className="text-red-500">Gagal, coba lagi</span>
                    ) : (
                      <span className="text-gray-400">Belum dikirim</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {row.reportedAt ? (
                      <span className="text-amber-600" title={row.reportNote ?? undefined}>
                        {row.reportNote}
                      </span>
                    ) : row.confirmedAt ? (
                      <span className="text-teal-600">Dikonfirmasi {formatSentAt(row.confirmedAt)}</span>
                    ) : (
                      <span className="text-gray-400">Belum konfirmasi</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
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
