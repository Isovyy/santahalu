"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ruleViolations } from "@/lib/matching";
import type { NotifyRow } from "@/lib/notify";
import type { ForceOption } from "./ForceMatch";

interface ReassignResult {
  swapped: boolean;
  pairs: {
    giverTwt: string;
    previousReceiverTwt: string;
    newReceiverTwt: string;
    violations: string[];
    previouslyRejected: boolean;
  }[];
  nowWithoutGiverTwt: string | null;
}

// Per-row manual rearranging: pick any receiver for this pair's giver. If the
// pick already has a giver, the two givers swap receivers.
export default function ReassignControl({
  runId,
  row,
  rows,
  participants,
}: {
  runId: string;
  row: NotifyRow;
  rows: NotifyRow[];
  participants: ForceOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [receiverId, setReceiverId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReassignResult | null>(null);

  const byId = new Map(participants.map((p) => [p.id, p]));
  const giver = byId.get(row.giverId);
  const oldReceiver = byId.get(row.receiverId);
  const newReceiver = byId.get(receiverId);
  // The pair currently holding the picked receiver — a swap partner.
  const other = rows.find((r) => r.receiverId === receiverId && r.matchId !== row.matchId);
  const otherGiver = other ? byId.get(other.giverId) : undefined;

  const options = participants.filter((p) => p.id !== row.giverId && p.id !== row.receiverId);

  const preview: { label: string; ok: boolean; reasons: string[] }[] = [];
  if (giver && newReceiver) {
    const reasons = ruleViolations(giver, newReceiver);
    preview.push({
      label: `${giver.twtUser} → ${newReceiver.twtUser}`,
      ok: reasons.length === 0,
      reasons,
    });
  }
  if (otherGiver && oldReceiver && otherGiver.id !== oldReceiver.id) {
    const reasons = ruleViolations(otherGiver, oldReceiver);
    preview.push({
      label: `${otherGiver.twtUser} → ${oldReceiver.twtUser} (tukar)`,
      ok: reasons.length === 0,
      reasons,
    });
  }
  const selfSwap = Boolean(otherGiver && oldReceiver && otherGiver.id === oldReceiver.id);

  async function save(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!receiverId || selfSwap) return;
    const broken = preview.filter((p) => !p.ok);
    if (
      broken.length > 0 &&
      !window.confirm(
        `Melanggar aturan matching:\n${broken
          .map((b) => `${b.label}: ${b.reasons.join(", ")}`)
          .join("\n")}\n\nTetap simpan?`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${runId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: row.matchId, receiverId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan.");
        return;
      }
      setResult(data);
      setOpen(false);
      setReceiverId("");
      router.refresh();
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  function stop(e: React.MouseEvent) {
    // Rows are wrapped in a <label> on mobile; keep clicks here from toggling
    // the row's reshuffle checkbox (the select and buttons handle their own).
    if (!(e.target as HTMLElement).closest("select, button")) e.preventDefault();
    e.stopPropagation();
  }

  if (!open) {
    return (
      <div onClick={stop} className="space-y-1">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
            setResult(null);
          }}
          className="text-xs text-teal-600 hover:underline"
        >
          Ubah receiver
        </button>
        {result && (
          <div className="text-xs text-teal-700">
            {result.pairs.map((p, i) => (
              <p key={i}>
                ✓ {p.giverTwt} → {p.newReceiverTwt}
                {p.violations.length > 0 && (
                  <span className="text-red-600"> ({p.violations.join(", ")})</span>
                )}
                {p.previouslyRejected && (
                  <span className="text-red-600"> (pernah dilaporkan!)</span>
                )}
              </p>
            ))}
            {result.nowWithoutGiverTwt && (
              <p className="text-amber-700">{result.nowWithoutGiverTwt} sekarang tanpa giver.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div onClick={stop} className="min-w-[14rem] space-y-2 rounded-lg border border-teal-200 bg-teal-50 p-2 text-xs">
      <select
        value={receiverId}
        onChange={(e) => setReceiverId(e.target.value)}
        className="w-full rounded border border-teal-200 bg-white px-2 py-1 text-sm text-gray-800"
      >
        <option value="">Receiver baru untuk {row.giverTwt}...</option>
        {options.map((p) => {
          const holder = rows.find((r) => r.receiverId === p.id);
          return (
            <option key={p.id} value={p.id}>
              {p.twtUser} — {p.fandomYume}
              {holder ? ` (tukar dengan ${holder.giverTwt})` : " (belum punya giver)"}
            </option>
          );
        })}
      </select>

      {preview.map((p, i) => (
        <p key={i} className={p.ok ? "text-teal-700" : "font-medium text-red-600"}>
          {p.ok ? "✓" : "⚠"} {p.label}
          {!p.ok && ` — ${p.reasons.join(", ")}`}
        </p>
      ))}
      {newReceiver && !other && oldReceiver && (
        <p className="text-amber-700">{oldReceiver.twtUser} akan jadi tanpa giver.</p>
      )}
      {selfSwap && (
        <p className="font-medium text-red-600">
          Tidak bisa: {otherGiver?.twtUser} akan memberi ke dirinya sendiri.
        </p>
      )}
      {error && <p className="text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!receiverId || selfSwap || saving}
          className="rounded bg-teal-500 px-3 py-1 font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            setReceiverId("");
            setError(null);
          }}
          className="rounded border border-gray-300 px-3 py-1 text-gray-700 hover:bg-white"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
