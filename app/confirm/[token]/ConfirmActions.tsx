"use client";

import { useState } from "react";

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

export default function ConfirmActions({
  token,
  initialConfirmedAt,
  initialReportedAt,
  initialReportNote,
}: {
  token: string;
  initialConfirmedAt: string | null;
  initialReportedAt: string | null;
  initialReportNote: string | null;
}) {
  const [confirmedAt, setConfirmedAt] = useState(initialConfirmedAt);
  const [reportedAt, setReportedAt] = useState(initialReportedAt);
  const [reportNote, setReportNote] = useState(initialReportNote ?? "");
  const [showReportForm, setShowReportForm] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "confirm" | "report", noteValue?: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/confirm/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: noteValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim, coba lagi.");
        setSubmitting(false);
        return;
      }
      const now = new Date().toISOString();
      if (action === "confirm") {
        setConfirmedAt(now);
        setReportedAt(null);
        setReportNote("");
        setShowReportForm(false);
      } else {
        setReportedAt(now);
        setReportNote(noteValue ?? "");
        setConfirmedAt(null);
      }
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedAt) {
    return (
      <div className="space-y-3 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-700">
        <p>Kamu sudah konfirmasi pasangan ini pada {formatWhen(confirmedAt)}.</p>
        <button
          type="button"
          onClick={() => setShowReportForm(true)}
          className="text-sm text-gray-500 hover:underline"
        >
          Ternyata ada masalah? Laporkan di sini
        </button>
        {showReportForm && (
          <ReportForm
            note={note}
            setNote={setNote}
            submitting={submitting}
            onSubmit={() => submit("report", note)}
          />
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  if (reportedAt) {
    return (
      <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        <p>Laporan kamu diterima pada {formatWhen(reportedAt)}:</p>
        <p className="whitespace-pre-wrap break-words font-medium">{reportNote}</p>
        <button
          type="button"
          onClick={() => submit("confirm")}
          disabled={submitting}
          className="text-sm text-gray-500 hover:underline disabled:opacity-50"
        >
          Sudah beres? Konfirmasi pasangan ini
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => submit("confirm")}
          disabled={submitting}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
        >
          Konfirmasi, semua sudah sesuai
        </button>
        <button
          type="button"
          onClick={() => setShowReportForm((v) => !v)}
          className="rounded-lg border border-teal-200 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50"
        >
          Laporkan masalah
        </button>
      </div>
      {showReportForm && (
        <ReportForm
          note={note}
          setNote={setNote}
          submitting={submitting}
          onSubmit={() => submit("report", note)}
        />
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function ReportForm({
  note,
  setNote,
  submitting,
  onSubmit,
}: {
  note: string;
  setNote: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-teal-100 bg-white p-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Jelaskan masalahnya (mis. dapat doubles, fandom tidak sesuai, dll)"
        className="w-full rounded-lg border border-teal-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !note.trim()}
        className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
      >
        {submitting ? "Mengirim..." : "Kirim laporan"}
      </button>
    </div>
  );
}
