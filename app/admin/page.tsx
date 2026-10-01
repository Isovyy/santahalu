import Link from "next/link";
import { db } from "@/lib/db";
import RunMatchingForm from "./RunMatchingForm";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [{ total: participantCount }, runs] = await Promise.all([
    db.orm.public.Participant.aggregate((a) => ({ total: a.count() })),
    db.orm.public.MatchRun.orderBy((r) => r.createdAt.desc()).limit(20).all(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 lg:max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-teal-500">Admin</h1>
        <LogoutButton />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-teal-100 bg-white shadow-sm p-5">
          <h2 className="text-lg font-medium text-gray-800">Participants</h2>
          <p className="mt-1 text-3xl font-semibold text-teal-500">{participantCount}</p>
          <p className="mt-1 text-sm text-gray-400">registered so far</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/admin/responses"
              className="inline-block rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 active:bg-teal-600"
            >
              View responses
            </Link>
            <Link
              href="/admin/drive-folders"
              className="inline-block rounded-lg border border-teal-200 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50"
            >
              Buat folder Drive
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-teal-100 bg-white shadow-sm p-5">
          <h2 className="text-lg font-medium text-gray-800">Run matching</h2>
          <p className="mt-1 text-sm text-gray-400">
            Uses all currently registered participants. Give the same seed to reproduce the same
            result later.
          </p>
          <div className="mt-4">
            <RunMatchingForm disabled={participantCount < 2} />
          </div>
          {participantCount < 2 && (
            <p className="mt-3 text-sm text-amber-600">Need at least 2 participants to run matching.</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-teal-100 bg-white shadow-sm p-5">
        <h2 className="text-lg font-medium text-gray-800">Past runs</h2>
        {runs.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No matching runs yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-teal-100">
            {runs.map((run) => (
              <li key={run.id} className="flex items-center justify-between py-2 text-sm">
                <div className="text-gray-600">
                  {run.createdAt.toLocaleString()}{" "}
                  <span className="text-gray-400">
                    ({run.matchedPairs}/{run.totalParticipants} matched
                    {run.seed !== null ? `, seed ${run.seed}` : ""})
                  </span>
                </div>
                <Link href={`/admin/results/${run.id}`} className="text-teal-500 hover:underline">
                  View results
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
