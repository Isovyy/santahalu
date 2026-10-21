import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { loadRejectedPairs } from "@/lib/rejectedPairs";
import Playground, { type PlaygroundPerson } from "./Playground";

export const dynamic = "force-dynamic";

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  const [run, participants, removals, rejected] = await Promise.all([
    db.orm.public.MatchRun.include("matches").first({ id: runId }),
    db.orm.public.Participant.orderBy((p) => p.twtUser.asc()).all(),
    db.orm.public.MatchRunRemoval.where({ matchRunId: runId }).all(),
    // Read-only here: opening the playground must not write anything.
    loadRejectedPairs({ persist: false }),
  ]);
  if (!run) notFound();

  const removedIds = new Set(removals.map((r) => r.participantId));
  const people: PlaygroundPerson[] = participants
    .filter((p) => !removedIds.has(p.id))
    .map((p) => ({
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
    }));

  const baseline = run.matches.map((m) => ({ giverId: m.giverId, receiverId: m.receiverId }));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link href={`/admin/results/${runId}`} className="text-sm text-teal-500 hover:underline">
        &larr; Back to results
      </Link>

      <h1 className="mt-3 text-3xl font-bold text-teal-500">Playground</h1>
      <p className="mt-1 text-sm text-gray-500">
        Coba-coba susun ulang pasangan di sini. <strong>Tidak ada yang tersimpan</strong> sampai
        kamu klik &quot;Terapkan&quot;. Muat ulang halaman = mulai lagi dari pasangan yang
        sekarang.
      </p>

      <div className="mt-6">
        <Playground
          runId={runId}
          people={people}
          baseline={baseline}
          rejectedPairs={[...rejected]}
        />
      </div>
    </main>
  );
}
