"use client";

import { useMemo, useState } from "react";
import { canGiveTo, matchBipartite, ruleViolations, type MatchParticipant } from "@/lib/matching";

export interface PlaygroundPerson extends MatchParticipant {
  twtUser: string;
}

type Draft = Record<string, string>; // giverId -> receiverId

function giverOf(draft: Draft, receiverId: string): string | undefined {
  return Object.keys(draft).find((g) => draft[g] === receiverId);
}

// Client-only sandbox over a copy of the run's pairs. Every edit stays in
// local state (with undo) until "Terapkan" sends the final mapping to the
// playground API.
export default function Playground({
  runId,
  people,
  baseline,
  rejectedPairs,
}: {
  runId: string;
  people: PlaygroundPerson[];
  baseline: { giverId: string; receiverId: string }[];
  rejectedPairs: string[];
}) {
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const rejected = useMemo(() => new Set(rejectedPairs), [rejectedPairs]);
  const initial = useMemo<Draft>(
    () => Object.fromEntries(baseline.map((b) => [b.giverId, b.receiverId])),
    [baseline],
  );

  const [draft, setDraft] = useState<Draft>(initial);
  const [history, setHistory] = useState<Draft[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [formGiver, setFormGiver] = useState("");
  const [formReceiver, setFormReceiver] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [includeUnmatched, setIncludeUnmatched] = useState(true);
  const [query, setQuery] = useState("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = (id: string | undefined) => (id ? (byId.get(id)?.twtUser ?? "?") : "-");

  function commit(next: Draft, msg: string) {
    setHistory((h) => [...h, draft]);
    setDraft(next);
    setMessage(msg);
  }

  // Pairs giver → receiver no matter who they're with now. Nobody else is
  // moved: the receiver's old giver becomes "no receiver" and the giver's old
  // receiver becomes "no giver", to be paired up separately.
  function pair(g: string, r: string) {
    if (!g || !r) return;
    if (g === r) {
      setMessage("Giver dan receiver tidak boleh orang yang sama.");
      return;
    }
    if (draft[g] === r) {
      setMessage(`${name(g)} sudah memberi ke ${name(r)}.`);
      return;
    }
    const next = { ...draft };
    const oldR = next[g];
    const oldG = giverOf(next, r);
    next[g] = r;
    const notes = [`${name(g)} → ${name(r)}`];
    if (oldG && oldG !== g) {
      delete next[oldG];
      notes.push(`${name(oldG)} sekarang tanpa receiver`);
    }
    if (oldR) {
      notes.push(`${name(oldR)} sekarang tanpa giver`);
    }
    commit(next, notes.join(" · "));
  }

  function unpair(g: string) {
    const next = { ...draft };
    const r = next[g];
    delete next[g];
    commit(next, `${name(g)} dilepas dari ${name(r)}.`);
  }

  // Re-pairs the ticked givers (plus, optionally, everyone currently
  // unmatched) among themselves, following the matching rules and never
  // repeating a reported pair.
  function shuffleSelected() {
    const giverIds = new Set(selected);
    const receiverIds = new Set([...selected].map((g) => draft[g]).filter(Boolean));
    if (includeUnmatched) {
      const taken = new Set(Object.values(draft));
      for (const p of people) {
        if (!draft[p.id]) giverIds.add(p.id);
        if (!taken.has(p.id)) receiverIds.add(p.id);
      }
    }
    if (giverIds.size === 0) {
      setMessage("Centang dulu pasangan yang mau di-shuffle.");
      return;
    }
    const givers = [...giverIds].map((id) => byId.get(id)!).filter(Boolean);
    const receivers = [...receiverIds].map((id) => byId.get(id)!).filter(Boolean);
    const { matches } = matchBipartite(
      givers,
      receivers,
      Math.floor(Math.random() * 2_000_000_000),
      rejected,
    );

    const next = { ...draft };
    for (const g of giverIds) delete next[g];
    for (const [gi, ri] of matches) next[givers[gi].id] = receivers[ri].id;
    const left = givers.length - matches.length;
    commit(
      next,
      `Shuffle ${givers.length} giver: ${matches.length} dapat pasangan` +
        (left > 0 ? `, ${left} tidak ada kandidat yang cocok (jadi tanpa receiver).` : "."),
    );
    setSelected(new Set());
  }

  function undo() {
    if (history.length === 0) return;
    setDraft(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setMessage("Dibatalkan 1 langkah.");
  }

  function reset() {
    setHistory((h) => [...h, draft]);
    setDraft(initial);
    setMessage("Kembali ke pasangan yang tersimpan sekarang.");
  }

  const receiverSet = new Set(Object.values(draft));
  const noReceiver = people.filter((p) => !draft[p.id]);
  const noGiver = people.filter((p) => !receiverSet.has(p.id));
  const changedGivers = people.filter((p) => (draft[p.id] ?? "") !== (initial[p.id] ?? ""));
  const violations = Object.entries(draft).filter(([g, r]) => {
    const giver = byId.get(g);
    const receiver = byId.get(r);
    return giver && receiver && !canGiveTo(giver, receiver);
  });
  const rejectedUsed = Object.entries(draft).filter(([g, r]) => rejected.has(`${g}:${r}`));

  async function apply() {
    if (changedGivers.length === 0) return;
    const warn =
      violations.length > 0 || rejectedUsed.length > 0
        ? `\n⚠ ${violations.length} melanggar aturan, ${rejectedUsed.length} pernah dilaporkan.`
        : "";
    if (
      !window.confirm(
        `Simpan perubahan untuk ${changedGivers.length} giver? Pasangan yang berubah akan direset ` +
          `(konfirmasi #2, perlu kirim email lagi).${warn}`,
      )
    ) {
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${runId}/playground`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseline,
          assignments: Object.entries(draft).map(([giverId, receiverId]) => ({
            giverId,
            receiverId,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan.");
        return;
      }
      // Start over from the newly saved state.
      window.location.reload();
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setApplying(false);
    }
  }

  const formGiverPerson = byId.get(formGiver);
  const formReceiverPerson = byId.get(formReceiver);
  const formViolations =
    formGiverPerson && formReceiverPerson && formGiver !== formReceiver
      ? ruleViolations(formGiverPerson, formReceiverPerson)
      : null;

  const q = query.trim().toLowerCase();
  const visible = people.filter((p) => {
    if (!q) return true;
    const r = byId.get(draft[p.id]);
    return [p.twtUser, p.fandomYume, p.oshiName, r?.twtUser, r?.fandomYume, r?.oshiName]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const selectClass =
    "w-full rounded-lg border border-teal-200 bg-white px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-300";

  return (
    <div className="space-y-4">
      {/* Summary + save */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="text-gray-700">
            <strong>{changedGivers.length}</strong> berubah
          </span>
          <span className={violations.length ? "text-red-600" : "text-gray-500"}>
            {violations.length} melanggar aturan
          </span>
          <span className={rejectedUsed.length ? "text-red-600" : "text-gray-500"}>
            {rejectedUsed.length} pernah dilaporkan
          </span>
          <span className={noReceiver.length ? "text-amber-600" : "text-gray-500"}>
            {noReceiver.length} tanpa receiver
          </span>
          <span className={noGiver.length ? "text-amber-600" : "text-gray-500"}>
            {noGiver.length} tanpa giver
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            className="rounded-lg border border-teal-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-teal-50 disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={changedGivers.length === 0}
            className="rounded-lg border border-teal-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-teal-50 disabled:opacity-40"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={applying || changedGivers.length === 0}
            className="rounded-lg bg-teal-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 disabled:opacity-40"
          >
            {applying ? "Menyimpan..." : `Terapkan (${changedGivers.length})`}
          </button>
        </div>
      </div>

      {message && (
        <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700">{message}</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Pair any two people */}
      <div className="space-y-2 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-800">Pasangkan 2 orang</p>
        <p className="text-xs text-gray-400">
          Boleh walaupun sudah punya pasangan &mdash; pasangan lama mereka jadi tanpa giver /
          tanpa receiver (tidak ditukar otomatis).
        </p>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
          <select value={formGiver} onChange={(e) => setFormGiver(e.target.value)} className={selectClass}>
            <option value="">Giver...</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.twtUser} {draft[p.id] ? `(memberi ke ${name(draft[p.id])})` : "(tanpa receiver)"}
              </option>
            ))}
          </select>
          <span className="hidden text-gray-400 sm:block">&rarr;</span>
          <select
            value={formReceiver}
            onChange={(e) => setFormReceiver(e.target.value)}
            className={selectClass}
          >
            <option value="">Receiver...</option>
            {people.map((p) => {
              const g = giverOf(draft, p.id);
              return (
                <option key={p.id} value={p.id}>
                  {p.twtUser} — {p.fandomYume} {g ? `(diberi oleh ${name(g)})` : "(tanpa giver)"}
                </option>
              );
            })}
          </select>
          <button
            type="button"
            onClick={() => pair(formGiver, formReceiver)}
            disabled={!formGiver || !formReceiver}
            className="rounded-lg bg-teal-400 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
          >
            Pasangkan
          </button>
        </div>
        {formViolations && (
          <p className={`text-xs ${formViolations.length === 0 ? "text-teal-600" : "text-red-600"}`}>
            {formViolations.length === 0
              ? "✓ Sesuai aturan matching."
              : `⚠ Melanggar aturan: ${formViolations.join(", ")}.`}
            {rejected.has(`${formGiver}:${formReceiver}`) && " ⚠ Pasangan ini pernah dilaporkan."}
          </p>
        )}
      </div>

      {/* Shuffle */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
        <span className="text-sm text-gray-700">{selected.size} dicentang</span>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={includeUnmatched}
            onChange={(e) => setIncludeUnmatched(e.target.checked)}
          />
          Ikutkan semua yang belum punya pasangan
        </label>
        <button
          type="button"
          onClick={shuffleSelected}
          className="rounded-lg border border-teal-200 px-4 py-1.5 text-sm text-teal-600 hover:bg-teal-50"
        >
          Shuffle
        </button>
        <span className="text-xs text-gray-400">
          Mengikuti aturan matching. Klik lagi untuk hasil acak lain, atau Undo.
        </span>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari username, oshi, atau fandom..."
        className="w-full max-w-sm rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-300"
      />

      {/* Draft pairs */}
      <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-teal-100 text-sm">
          <thead className="bg-teal-50 text-teal-600">
            <tr>
              <th className="px-3 py-2 text-left"></th>
              <th className="px-3 py-2 text-left font-medium">Giver</th>
              <th className="px-3 py-2 text-left font-medium">Receiver</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {visible.map((p) => {
              const r = byId.get(draft[p.id]);
              const changed = (draft[p.id] ?? "") !== (initial[p.id] ?? "");
              const reasons = r ? ruleViolations(p, r) : [];
              const wasRejected = r ? rejected.has(`${p.id}:${r.id}`) : false;
              return (
                <tr key={p.id} className={changed ? "bg-violet-50/60 text-gray-700" : "text-gray-600"}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.id)) next.delete(p.id);
                          else next.add(p.id);
                          return next;
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800">{p.twtUser}</div>
                    <div className="text-xs text-gray-400">memberi: {p.fandomGive || "-"}</div>
                  </td>
                  <td className="px-3 py-2">
                    {r ? (
                      <>
                        <div>{r.twtUser}</div>
                        <div className="text-xs text-gray-400">
                          {r.fandomYume} &middot; {r.oshiName}
                        </div>
                      </>
                    ) : (
                      <span className="text-amber-600">tanpa receiver</span>
                    )}
                    {changed && initial[p.id] && (
                      <div className="text-xs text-gray-400">sebelumnya: {name(initial[p.id])}</div>
                    )}
                  </td>
                  <td className="space-x-1 px-3 py-2">
                    {changed && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                        Berubah
                      </span>
                    )}
                    {reasons.length > 0 && (
                      <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        ⚠ {reasons.join(", ")}
                      </span>
                    )}
                    {wasRejected && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        ⚠ Pernah dilaporkan
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormGiver(p.id)}
                      className="mr-3 text-teal-600 hover:underline"
                    >
                      Pilih sbg giver
                    </button>
                    {r && (
                      <button
                        type="button"
                        onClick={() => unpair(p.id)}
                        className="text-red-500 hover:underline"
                      >
                        Lepas
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {noGiver.length > 0 && (
        <p className="text-sm text-amber-700">
          Tanpa giver: {noGiver.map((p) => p.twtUser).join(", ")}
        </p>
      )}
    </div>
  );
}
