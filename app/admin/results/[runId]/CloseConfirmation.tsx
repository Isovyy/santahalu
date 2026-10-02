"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CloseConfirmation({
  runId,
  initialClosed,
}: {
  runId: string;
  initialClosed: boolean;
}) {
  const router = useRouter();
  const [closed, setClosed] = useState(initialClosed);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${runId}/close-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closed: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan.");
        return;
      }
      setClosed(next);
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (closed) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggle(false)}
          disabled={saving}
          className="rounded-lg border border-teal-200 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 disabled:opacity-50"
        >
          {saving ? "Membuka..." : "Buka lagi konfirmasi"}
        </button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
        <span className="text-red-700">
          Tutup konfirmasi? Peserta tidak bisa lagi konfirmasi atau lapor masalah lewat link di
          email mereka.
        </span>
        <button
          type="button"
          onClick={() => toggle(true)}
          disabled={saving}
          className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
        >
          {saving ? "Menutup..." : "Ya, tutup"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={saving}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Batal
        </button>
        {error && <span className="text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-teal-200 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50"
    >
      Tutup konfirmasi
    </button>
  );
}
