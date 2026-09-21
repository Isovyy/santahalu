"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Login failed");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4">
      <div className="mb-2 text-center">
        <div className="mb-2 flex justify-center">
          <Image src="/yumefess-icon.png" alt="Yumefess" width={64} height={64} />
        </div>
        <h1 className="text-2xl font-bold text-teal-500">Admin login</h1>
      </div>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
        <input
          type="password"
          autoFocus
          required
          placeholder="Admin password"
          className="w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-300"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 active:bg-teal-600 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </main>
  );
}
