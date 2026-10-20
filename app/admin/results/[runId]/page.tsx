import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchRunResults } from "@/lib/results";
import { formatAvoidList } from "@/lib/avoidList";
import MatchedPairsTable from "./MatchedPairsTable";
import DeleteMatchRun from "./DeleteMatchRun";
import CloseConfirmation from "./CloseConfirmation";
import { confirmRoundOf, reassignedGiverTwts } from "@/lib/confirmRound";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const results = await getMatchRunResults(runId);
  if (!results) notFound();

  const { run, rows, noGiver, noReceiver, removed, totalCurrentParticipants } = results;
  const matchedRows = rows.filter((r) => r.giver_twt_user && r.receiver_twt_user);

  const reassigned = await reassignedGiverTwts(run.id);
  const round2Count = run.matches.filter(
    (m) => confirmRoundOf(m.giver.twtUser, reassigned) === 2,
  ).length;
  const round1Count = run.matches.length - round2Count;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Link href="/admin" className="text-sm text-teal-500 hover:underline">
        &larr; Back to admin
      </Link>

      <h1 className="mt-3 text-3xl font-bold text-teal-500">
        Results: {run.createdAt.toLocaleString()}
      </h1>

      <section className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-6">
        <Stat label="Participants (run)" value={run.totalParticipants} />
        <Stat label="Participants (now)" value={totalCurrentParticipants} />
        <Stat label="Matched pairs" value={run.matchedPairs} />
        <Stat label="No giver" value={noGiver.length} />
        <Stat label="No receiver" value={noReceiver.length} />
        <Stat label="Dihapus" value={removed.length} />
      </section>
      {run.seed !== null && (
        <p className="mt-2 text-sm text-gray-400">Seed: {run.seed}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/admin/results/${run.id}/send`}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500"
        >
          Kirim email
        </Link>
        <Link
          href={`/admin/results/${run.id}/reshuffle`}
          className="rounded-lg border border-teal-200 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50"
        >
          Reshuffle pasangan
        </Link>
        <DeleteMatchRun runId={run.id} />
      </div>

      <section className="mt-4 space-y-2 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
        <CloseConfirmation
          runId={run.id}
          round={1}
          pairCount={round1Count}
          initialClosed={Boolean(run.confirmationClosedAt)}
        />
        <CloseConfirmation
          runId={run.id}
          round={2}
          pairCount={round2Count}
          initialClosed={Boolean(run.confirmation2ClosedAt)}
        />
        <p className="text-xs text-gray-400">
          #1 = pasangan dari matching awal yang belum pernah diubah. #2 = pasangan yang dibuat atau
          diubah lewat reshuffle, solusi otomatis, pasangkan manual, atau dikembalikan. Setiap
          ronde bisa dibuka/ditutup sendiri.
        </p>
      </section>

      <h2 className="mt-10 text-lg font-medium text-gray-800">Matched pairs</h2>
      <p className="mt-1 text-xs text-gray-400">
        Columns show the values matching was based on, as giver &rarr; receiver, so you can
        eyeball why a pairing happened. Drag a column&apos;s right edge to resize it.
      </p>
      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        <a
          href={`/api/admin/export/${run.id}/all`}
          className="text-teal-600 hover:underline"
        >
          Download results_all.csv
        </a>
        <a
          href={`/api/admin/export/${run.id}/unmatched`}
          className="text-teal-600 hover:underline"
        >
          Download unmatched.csv
        </a>
      </div>
      <div className="mt-3 -mx-4 sm:mx-0">
        <MatchedPairsTable rows={matchedRows} />
      </div>

      <h2 className="mt-10 text-lg font-medium text-gray-800">No giver ({noGiver.length})</h2>
      <p className="mt-1 text-xs text-gray-400">
        Tidak ada yang ditugaskan memberi hadiah ke peserta ini, mereka tidak akan menerima
        apa-apa kecuali ada yang direshuffle ke sini.
      </p>
      <div className="mt-3">
        <UnmatchedTable participants={noGiver} />
      </div>

      <h2 className="mt-10 text-lg font-medium text-gray-800">No receiver ({noReceiver.length})</h2>
      <p className="mt-1 text-xs text-gray-400">
        Peserta ini tidak ditugaskan memberi ke siapa pun, giving slot mereka tidak terpakai.
      </p>
      <div className="mt-3">
        <UnmatchedTable participants={noReceiver} />
      </div>

      {removed.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-medium text-gray-800">Dihapus ({removed.length})</h2>
          <p className="mt-1 text-xs text-gray-400">
            Dikeluarkan dari matching ini oleh admin. Bisa dikembalikan dari halaman Reshuffle.
          </p>
          <div className="mt-3">
            <UnmatchedTable participants={removed} />
          </div>
        </>
      )}
    </main>
  );
}

interface UnmatchedParticipant {
  id: string;
  twtUser: string;
  email: string;
  yumeshipName: string;
  oshiName: string;
  relationshipType: string;
  yumeTypeReceive: string | null;
  fandomYume: string;
  contentType: string;
  languageGive: string | null;
  languageReceive: string;
  fandomGive: string;
  yumeDocuLink: string;
  notes: string | null;
  avoidList: string | null;
}

function UnmatchedTable({ participants }: { participants: UnmatchedParticipant[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-teal-100 text-sm">
        <thead className="bg-teal-50 text-teal-600">
          <tr>
            <Th>Handle</Th>
            <Th>Email</Th>
            <Th>Yumeship</Th>
            <Th>Oshi</Th>
            <Th>Tipe Yumeship</Th>
            <Th>Yumeship type</Th>
            <Th>Fandom</Th>
            <Th>Karya</Th>
            <Th>Bahasa ditulis</Th>
            <Th>Bahasa diterima</Th>
            <Th>Fandom diberikan</Th>
            <Th>Dokumen</Th>
            <Th>Notes</Th>
            <Th>Avoid list</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-teal-100">
          {participants.map((p) => (
            <tr key={p.id} className="text-gray-600">
              <Td>{p.twtUser}</Td>
              <Td>{p.email}</Td>
              <Td>{p.yumeshipName}</Td>
              <Td>{p.oshiName}</Td>
              <Td>{p.relationshipType}</Td>
              <Td>{p.yumeTypeReceive || "-"}</Td>
              <Td>{p.fandomYume}</Td>
              <Td>{p.contentType}</Td>
              <Td>{p.languageGive || "-"}</Td>
              <Td>{p.languageReceive}</Td>
              <Td>{p.fandomGive}</Td>
              <Td className="max-w-[12rem] truncate" title={p.yumeDocuLink}>
                {p.yumeDocuLink}
              </Td>
              <Td className="max-w-[12rem] truncate" title={p.notes ?? undefined}>
                {p.notes || "-"}
              </Td>
              <Td>{formatAvoidList(p.avoidList ?? "")}</Td>
            </tr>
          ))}
          {participants.length === 0 && (
            <tr>
              <td colSpan={14} className="px-4 py-6 text-center text-gray-400">
                Tidak ada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-teal-100 bg-white shadow-sm p-4">
      <p className="text-3xl font-bold text-teal-500">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 text-left font-medium">{children}</th>;
}

function Td({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={`px-4 py-2 ${className ?? ""}`} title={title}>
      {children}
    </td>
  );
}
