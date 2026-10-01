import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SUBMISSION_DEADLINE, formatDeadline } from "@/lib/emailHtml";
import ExtendActions from "./ExtendActions";

export const dynamic = "force-dynamic";

export default async function ExtendPage({
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
        <h1 className="text-2xl font-bold text-teal-500">Minta Perpanjangan Waktu</h1>
        <p className="mt-2 text-sm text-gray-600">
          Deadline saat ini: {formatDeadline(SUBMISSION_DEADLINE)}. Perpanjangan maksimal 3 hari,
          dan hanya bisa diajukan sekali.
        </p>
        <div className="mt-4">
          <ExtendActions
            token={token}
            initialExtensionDays={match.extensionDays}
            initialExtensionRequestedAt={
              match.extensionRequestedAt ? match.extensionRequestedAt.toString() : null
            }
          />
        </div>
      </div>
    </main>
  );
}
