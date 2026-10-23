import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import SubmitActions from "./SubmitActions";

export const dynamic = "force-dynamic";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const match = await db.orm.public.Match
    .include("receiver")
    .first({ confirmToken: token });
  if (!match) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-teal-500">Konfirmasi Hadiah Sudah Diupload</h1>
        <p className="mt-2 text-sm text-gray-600">
          Untuk {match.receiver.yumeshipName} - {match.receiver.fandomYume}.
        </p>
        <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-700">Ketentuan karya:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Karya bertema musim dingin/natal/tahun baru.</li>
            <li>
              Art MINIMAL colored sketch. Minimal bust up couple untuk non-chibi dan half body couple untuk
              chibi.
            </li>
            <li>Writing MINIMAL 1000 kata.</li>
          </ol>
          <p className="mt-3 text-amber-700">
            Kegagalan memenuhi kriteria minimum di atas tanpa komunikasi ke admin dapat
            mengakibatkan BAN dari seluruh event Santahalu selanjutnya.
          </p>
        </div>
        <div className="mt-4">
          <SubmitActions
            token={token}
            initialSubmittedAt={match.submittedAt ? match.submittedAt.toString() : null}
          />
        </div>
      </div>
    </main>
  );
}
