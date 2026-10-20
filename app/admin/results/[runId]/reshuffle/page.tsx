import Link from "next/link";
import { notFound } from "next/navigation";
import { getNotifyRows } from "@/lib/notify";
import { db } from "@/lib/db";
import { canGiveTo } from "@/lib/matching";
import ReshuffleMatches from "./ReshuffleMatches";
import ForceMatch, { type ForceOption } from "./ForceMatch";
import RemovedParticipants from "./RemovedParticipants";

export const dynamic = "force-dynamic";

function toForceOption(p: {
  id: string;
  twtUser: string;
  oshiName: string;
  fandomYume: string;
  fandomGive: string | null;
  languageGive: string | null;
  languageReceive: string | null;
  yumeTypeGive: string | null;
  yumeTypeReceive: string | null;
  contentType: string;
  avoidList: string | null;
}): ForceOption {
  return {
    id: p.id,
    twtUser: p.twtUser,
    oshiName: p.oshiName,
    fandomYume: p.fandomYume,
    fandomGive: p.fandomGive,
    languageGive: p.languageGive,
    languageReceive: p.languageReceive,
    yumeTypeGive: p.yumeTypeGive,
    yumeTypeReceive: p.yumeTypeReceive,
    contentType: p.contentType,
    avoidList: p.avoidList,
  };
}

export default async function ReshufflePage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const data = await getNotifyRows(runId);
  if (!data) notFound();

  const [history, run, participants, removals] = await Promise.all([
    db.orm.public.MatchReshuffleLog
      .where({ matchRunId: runId })
      .orderBy((h) => h.reshuffledAt.desc())
      .all(),
    db.orm.public.MatchRun
      .include("matches", (m) => m.include("giver").include("receiver"))
      .first({ id: runId }),
    db.orm.public.Participant.orderBy((p) => p.twtUser.asc()).all(),
    db.orm.public.MatchRunRemoval
      .where({ matchRunId: runId })
      .orderBy((r) => r.removedAt.desc())
      .all(),
  ]);
  if (!run) notFound();

  // Pairs that break the matching rules against everyone's *current* answers:
  // forced pairs, or valid pairs that went stale after someone edited their
  // entry. Flagged in the table so they can be ticked into a reshuffle.
  const ruleBreakingMatchIds = run.matches
    .filter((m) => !canGiveTo(m.giver, m.receiver))
    .map((m) => m.id);

  const giverIds = new Set(run.matches.map((m) => m.giverId));
  const receiverIds = new Set(run.matches.map((m) => m.receiverId));
  const removedIds = new Set(removals.map((r) => r.participantId));
  const noReceiver = participants
    .filter((p) => !giverIds.has(p.id) && !removedIds.has(p.id))
    .map(toForceOption);
  const noGiver = participants
    .filter((p) => !receiverIds.has(p.id) && !removedIds.has(p.id))
    .map(toForceOption);

  const twtOf = new Map(participants.map((p) => [p.id, p.twtUser]));
  const removed = removals
    .filter((r) => twtOf.has(r.participantId))
    .map((r) => ({
      participantId: r.participantId,
      twtUser: twtOf.get(r.participantId)!,
      removedAt: r.removedAt.toLocaleString(),
      formerReceiverTwt: r.formerReceiverId ? (twtOf.get(r.formerReceiverId) ?? null) : null,
      formerGiverTwt: r.formerGiverId ? (twtOf.get(r.formerGiverId) ?? null) : null,
    }));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link href={`/admin/results/${runId}`} className="text-sm text-teal-500 hover:underline">
        &larr; Back to results
      </Link>

      <h1 className="mt-3 text-3xl font-bold text-teal-500">Reshuffle pasangan</h1>
      <p className="mt-1 text-sm text-gray-500">
        Pilih pasangan yang perlu dipasangkan ulang (yang melapor masalah sudah tercentang
        otomatis). Kalau tidak ada kandidat yang cocok di dalam pilihan, tambahkan pasangan lain
        supaya ada lebih banyak opsi. Pasangan yang berhasil direshuffle akan direset statusnya
        dan perlu dikirim ulang email pasangannya.
      </p>

      <div className="mt-6">
        <ForceMatch runId={runId} givers={noReceiver} receivers={noGiver} />
      </div>

      <div className="mt-6">
        <ReshuffleMatches
          runId={runId}
          rows={data.rows}
          ruleBreakingMatchIds={ruleBreakingMatchIds}
          participants={participants.filter((p) => !removedIds.has(p.id)).map(toForceOption)}
        />
      </div>

      <div className="mt-10">
        <RemovedParticipants runId={runId} removed={removed} />
      </div>

      <h2 className="mt-10 text-lg font-medium text-gray-800">
        Riwayat reshuffle ({history.length})
      </h2>
      <p className="mt-1 text-xs text-gray-400">
        Pasangan sebelum setiap reshuffle yang pernah diterapkan pada hasil matching ini.
      </p>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-teal-100 text-sm">
          <thead className="bg-teal-50 text-teal-600">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Waktu</th>
              <th className="px-4 py-2 text-left font-medium">Giver</th>
              <th className="px-4 py-2 text-left font-medium">Pasangan sebelumnya</th>
              <th className="px-4 py-2 text-left font-medium">Pasangan baru</th>
              <th className="px-4 py-2 text-left font-medium">Seed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {history.map((h) => (
              <tr key={h.id} className="text-gray-600">
                <td className="whitespace-nowrap px-4 py-2 text-gray-400">
                  {h.reshuffledAt.toLocaleString()}
                </td>
                <td className="px-4 py-2">{h.giverTwt}</td>
                <td className="px-4 py-2">
                  {h.previousReceiverTwt}{" "}
                  <span className="text-gray-400">
                    ({h.previousReceiverFandomYume} &middot; {h.previousReceiverOshiName})
                  </span>
                </td>
                <td className="px-4 py-2">
                  {h.newReceiverTwt}{" "}
                  <span className="text-gray-400">
                    ({h.newReceiverFandomYume} &middot; {h.newReceiverOshiName})
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-400">{h.seed ?? "Auto"}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Belum ada reshuffle yang diterapkan pada hasil matching ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
