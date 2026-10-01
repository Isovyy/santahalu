import Link from "next/link";
import { notFound } from "next/navigation";
import { getNotifyRows } from "@/lib/notify";
import SendReminderEmails from "./SendReminderEmails";

export const dynamic = "force-dynamic";

export default async function SendReminderEmailsPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const data = await getNotifyRows(runId);
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link href={`/admin/results/${runId}`} className="text-sm text-teal-500 hover:underline">
        &larr; Back to results
      </Link>

      <h1 className="mt-3 text-3xl font-bold text-teal-500">Kirim reminder deadline</h1>
      <p className="mt-1 text-sm text-gray-500">
        Reminder H-5 ke giver yang belum upload hadiah. Bisa dikirim ulang kapan saja &mdash;
        tidak seperti email lain, ini tidak mengunci baris yang sudah terkirim.
      </p>

      <div className="mt-6">
        <SendReminderEmails runId={runId} rows={data.rows} />
      </div>
    </main>
  );
}
