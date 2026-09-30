import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ConfirmActions from "./ConfirmActions";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({
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
        <h1 className="text-2xl font-bold text-teal-500">Konfirmasi Pasangan</h1>
        <p className="mt-2 text-sm text-gray-600">
          Kamu akan membuatkan hadiah untuk fandom <strong>{match.receiver.fandomYume}</strong>,
          oshi <strong>{match.receiver.oshiName}</strong>.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Kalau sudah sesuai, konfirmasi di bawah. Kalau ada masalah (dapat doubles, fandom
          tidak sesuai, dll), laporkan supaya admin bisa reshuffle sebelum kamu mulai membuat
          hadiah.
        </p>
        <div className="mt-4">
          <ConfirmActions
            token={token}
            initialConfirmedAt={match.confirmedAt ? match.confirmedAt.toString() : null}
            initialReportedAt={match.reportedAt ? match.reportedAt.toString() : null}
            initialReportNote={match.reportNote}
          />
        </div>
      </div>
    </main>
  );
}
