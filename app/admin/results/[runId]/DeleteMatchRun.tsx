"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteMatchRun({ runId }: { runId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${runId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menghapus.");
        setDeleting(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error, coba lagi.");
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
        <span className="text-red-700">
          Yakin? Semua pasangan, konfirmasi, laporan, dan perpanjangan di run ini akan hilang
          permanen. Jawaban peserta tidak terpengaruh.
        </span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
        >
          {deleting ? "Menghapus..." : "Ya, hapus"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
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
      className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
    >
      Hapus hasil matching
    </button>
  );
}
