"use client";

import { useState } from "react";

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

export default function ExtendActions({
  token,
  initialExtensionDays,
  initialExtensionRequestedAt,
}: {
  token: string;
  initialExtensionDays: number | null;
  initialExtensionRequestedAt: string | null;
}) {
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState("");
  const [extensionDays, setExtensionDays] = useState(initialExtensionDays);
  const [requestedAt, setRequestedAt] = useState(initialExtensionRequestedAt);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/extend/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim, coba lagi.");
        return;
      }
      setExtensionDays(days);
      setRequestedAt(new Date().toISOString());
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (extensionDays) {
    return (
      <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-700">
        Perpanjangan {extensionDays} hari disetujui otomatis
        {requestedAt ? ` pada ${formatWhen(requestedAt)}` : ""}.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700">Berapa hari?</label>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDays(n)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                days === n
                  ? "border-teal-400 bg-teal-400 text-white"
                  : "border-teal-200 text-gray-700 hover:bg-teal-50"
              }`}
            >
              {n} hari
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Alasan (opsional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-teal-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
      >
        {submitting ? "Mengirim..." : "Ajukan perpanjangan"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
