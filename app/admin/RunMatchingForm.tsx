"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RunMatchingForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed: seed.trim() ? Number(seed) : undefined }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Matching failed");
      setLoading(false);
      return;
    }

    router.push(`/admin/results/${data.runId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="block text-sm font-medium text-gray-700">Seed (optional)</span>
        <input
          type="number"
          className="mt-1 w-40 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-300"
          placeholder="random"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={disabled || loading}
        className="rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 active:bg-teal-600 disabled:opacity-50"
      >
        {loading ? "Matching..." : "Run Matching"}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
