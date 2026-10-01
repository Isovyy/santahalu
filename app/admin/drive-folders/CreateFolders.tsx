"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface FolderRow {
  id: string;
  twtUser: string;
  fandomYume: string;
  folderLink: string | null;
}

export default function CreateFolders({ rows }: { rows: FolderRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, string> | null>(null);

  const eligibleIds = useMemo(
    () => rows.filter((r) => !r.folderLink).map((r) => r.id),
    [rows],
  );
  const allEligibleSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllEligible() {
    setSelected(allEligibleSelected ? new Set() : new Set(eligibleIds));
  }

  async function handleCreate() {
    if (selected.size === 0) return;
    setCreating(true);
    setError(null);
    setLastResults(null);

    try {
      const res = await fetch("/api/admin/participants/create-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat folder.");
        return;
      }
      setLastResults(data.results);
      setSelected(new Set());
      router.refresh();
    } catch {
      setError("Network error, coba lagi.");
    } finally {
      setCreating(false);
    }
  }

  const doneCount = rows.filter((r) => r.folderLink).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          {doneCount} dari {rows.length} sudah punya folder &middot; {selected.size} dipilih
        </p>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || selected.size === 0}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
        >
          {creating ? "Membuat..." : `Buat folder untuk ${selected.size} peserta terpilih`}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-teal-100 text-sm">
          <thead className="bg-teal-50 text-teal-600">
            <tr>
              <th className="px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allEligibleSelected}
                  onChange={toggleAllEligible}
                  aria-label="Pilih semua yang belum punya folder"
                />
              </th>
              <th className="px-4 py-2 text-left font-medium">Username</th>
              <th className="px-4 py-2 text-left font-medium">Fandom</th>
              <th className="px-4 py-2 text-left font-medium">Folder</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {rows.map((row) => {
              const result = lastResults?.[row.id];
              return (
                <tr key={row.id} className="text-gray-600">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      disabled={Boolean(row.folderLink)}
                      onChange={() => toggleOne(row.id)}
                    />
                  </td>
                  <td className="px-4 py-2">{row.twtUser}</td>
                  <td className="px-4 py-2">{row.fandomYume}</td>
                  <td className="px-4 py-2">
                    {row.folderLink ? (
                      <a
                        href={row.folderLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-500 hover:underline"
                      >
                        Buka folder
                      </a>
                    ) : result === "failed" ? (
                      <span className="text-red-500">Gagal, coba lagi</span>
                    ) : (
                      <span className="text-gray-400">Belum ada</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Belum ada peserta terdaftar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
