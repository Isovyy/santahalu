"use client";

import { useState } from "react";

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

export default function SubmitActions({
  token,
  initialSubmittedAt,
}: {
  token: string;
  initialSubmittedAt: string | null;
}) {
  const [submittedAt, setSubmittedAt] = useState(initialSubmittedAt);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/submit/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim, coba lagi.");
        return;
      }
      setSubmittedAt(new Date().toISOString());
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedAt) {
    return (
      <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-700">
        Sudah ditandai sudah upload pada {formatWhen(submittedAt)}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 rounded-lg border border-teal-100 bg-white p-4 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Saya menyatakan bahwa hadiah yang saya upload telah memenuhi kriteria minimum sesuai
          yang tertera.
        </span>
      </label>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!checked || submitting}
        className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
      >
        {submitting ? "Mengirim..." : "Tandai sudah upload"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
