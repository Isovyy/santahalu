"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetActiveButton({
  runId,
  isActive,
}: {
  runId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${runId}/set-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan.");
        setSaving(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error, coba lagi.");
      setSaving(false);
    }
  }

  if (isActive) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className="rounded-full bg-teal-400 px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
        title="Klik untuk menonaktifkan"
      >
        {saving ? "..." : "Aktif"}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className="text-xs text-teal-600 hover:underline disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Jadikan aktif"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
