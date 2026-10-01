import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchRunResults } from "@/lib/results";
import MatchedPairsTable from "./MatchedPairsTable";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const results = await getMatchRunResults(runId);
  if (!results) notFound();

  const { run, rows, noGiver, noReceiver, totalCurrentParticipants } = results;
  const matchedRows = rows.filter((r) => r.giver_twt_user && r.receiver_twt_user);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Link href="/admin" className="text-sm text-teal-500 hover:underline">
        &larr; Back to admin
      </Link>

      <h1 className="mt-3 text-3xl font-bold text-teal-500">
        Results: {run.createdAt.toLocaleString()}
      </h1>

      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label="Participants (run)" value={run.totalParticipants} />
        <Stat label="Participants (now)" value={totalCurrentParticipants} />
        <Stat label="Matched pairs" value={run.matchedPairs} />
        <Stat label="Tidak dapat giver" value={noGiver.length} />
        <Stat label="Tidak punya penerima" value={noReceiver.length} />
      </section>
      {run.seed !== null && (
        <p className="mt-2 text-sm text-gray-400">Seed: {run.seed}</p>
      )}

      <div className="mt-6 flex gap-3">
        <a
          href={`/api/admin/export/${run.id}/all`}
          className="rounded-lg border border-teal-200 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50"
        >
          Download results_all.csv
        </a>
        <a
          href={`/api/admin/export/${run.id}/unmatched`}
          className="rounded-lg border border-teal-200 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50"
        >
          Download unmatched.csv
        </a>
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
      </div>

      <h2 className="mt-10 text-lg font-medium text-gray-800">Matched pairs</h2>
      <p className="mt-1 text-xs text-gray-400">
        Columns show the values matching was based on, as giver &rarr; receiver, so you can
        eyeball why a pairing happened. Drag a column&apos;s right edge to resize it.
      </p>
      <div className="mt-3">
        <MatchedPairsTable rows={matchedRows} />
      </div>

      <h2 className="mt-10 text-lg font-medium text-gray-800">
        Tidak dapat giver ({noGiver.length})
      </h2>
      <p className="mt-1 text-xs text-gray-400">
        Tidak ada yang ditugaskan memberi hadiah ke peserta ini, mereka tidak akan menerima
        apa-apa kecuali ada yang direshuffle ke sini.
      </p>
      <div className="mt-3">
        <UnmatchedTable participants={noGiver} />
      </div>

      <h2 className="mt-10 text-lg font-medium text-gray-800">
        Tidak punya penerima ({noReceiver.length})
      </h2>
      <p className="mt-1 text-xs text-gray-400">
        Peserta ini tidak ditugaskan memberi ke siapa pun, giving slot mereka tidak terpakai.
      </p>
      <div className="mt-3">
        <UnmatchedTable participants={noReceiver} />
      </div>
    </main>
  );
}

function UnmatchedTable({
  participants,
}: {
  participants: { id: string; twtUser: string; email: string; yumeshipName: string; fandomYume: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-teal-100 text-sm">
        <thead className="bg-teal-50 text-teal-600">
          <tr>
            <Th>Handle</Th>
            <Th>Email</Th>
            <Th>Yumeship</Th>
            <Th>Fandom</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-teal-100">
          {participants.map((p) => (
            <tr key={p.id} className="text-gray-600">
              <Td>{p.twtUser}</Td>
              <Td>{p.email}</Td>
              <Td>{p.yumeshipName}</Td>
              <Td>{p.fandomYume}</Td>
            </tr>
          ))}
          {participants.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
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
