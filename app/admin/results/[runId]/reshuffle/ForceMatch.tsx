"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { canGiveTo, type MatchParticipant } from "@/lib/matching";

export interface ForceOption extends MatchParticipant {
  twtUser: string;
}

// Pairs a leftover "No receiver" giver with a leftover "No giver" receiver by
// hand, even if the pair breaks the matching rules, so both stay in the run
// and can be ticked into a later reshuffle like any other pair.
export default function ForceMatch({
  runId,
  givers,
  receivers,
}: {
  runId: string;
  givers: ForceOption[];
  receivers: ForceOption[];
}) {
  const router = useRouter();
  const [giverId, setGiverId] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (givers.length === 0 || receivers.length === 0) return null;

  const giver = givers.find((g) => g.id === giverId);
  const receiver = receivers.find((r) => r.id === receiverId);
  const samePerson = giver && receiver && giver.id === receiver.id;
  const followsRules = giver && receiver && !samePerson ? canGiveTo(giver, receiver) : null;

  async function save() {
    if (!giver || !receiver || samePerson) return;
    if (
      !followsRules &&
      !window.confirm(
        `${giver.twtUser} → ${receiver.twtUser} melanggar aturan matching. Tetap pasangkan?`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch(`/api/admin/matches/${runId}/force`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giverId: giver.id, receiverId: receiver.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memasangkan.");
        return;
      }
      setDone(`${data.giverTwt} → ${data.receiverTwt} tersimpan.`);
      setGiverId("");
      setReceiverId("");
      router.refresh();
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "w-full rounded-lg border border-teal-200 px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-300";

  return (
    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
      <div>
        <p className="font-medium text-amber-800">Pasangkan manual (paksa)</p>
        <p className="mt-1 text-xs text-amber-700">
          {givers.length} orang belum punya receiver, {receivers.length} orang belum punya giver.
          Pasangkan mereka secara manual supaya tetap masuk matching &mdash; walaupun melanggar
          aturan. Setelah dipasangkan, pasangan ini bisa dicentang di tabel bawah untuk
          di-reshuffle nanti (misalnya setelah seseorang menambah fandom).
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
        <label className="space-y-1">
          <span className="text-xs text-amber-700">Giver (belum punya receiver)</span>
          <select value={giverId} onChange={(e) => setGiverId(e.target.value)} className={selectClass}>
            <option value="">Pilih giver...</option>
            {givers.map((g) => (
              <option key={g.id} value={g.id}>
                {g.twtUser}
              </option>
            ))}
          </select>
        </label>
        <span className="hidden pb-2 text-amber-700 sm:block">&rarr;</span>
        <label className="space-y-1">
          <span className="text-xs text-amber-700">Receiver (belum punya giver)</span>
          <select
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            className={selectClass}
          >
            <option value="">Pilih receiver...</option>
            {receivers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.twtUser}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={!giver || !receiver || Boolean(samePerson) || saving}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Pasangkan"}
        </button>
      </div>

      {giver && receiver && (
        <div className="space-y-1 rounded-lg bg-white p-3 text-xs text-gray-600">
          <p>
            <span className="font-medium">{giver.twtUser}</span> bersedia membuat untuk fandom:{" "}
            {giver.fandomGive || "-"}
          </p>
          <p>
            <span className="font-medium">{receiver.twtUser}</span>: {receiver.fandomYume} &middot;{" "}
            {receiver.oshiName}
          </p>
          {samePerson ? (
            <p className="font-medium text-red-600">Giver dan receiver tidak boleh orang yang sama.</p>
          ) : followsRules ? (
            <p className="font-medium text-teal-600">✓ Sesuai aturan matching.</p>
          ) : (
            <p className="font-medium text-red-600">
              ⚠ Melanggar aturan matching (fandom, bahasa, tipe yume, oshi sama, atau avoid list).
            </p>
          )}
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
      {done && <p className="text-teal-700">{done}</p>}
    </div>
  );
}
