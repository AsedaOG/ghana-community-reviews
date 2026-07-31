"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={submit} role="search" className="flex w-full max-w-xl gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={
          compact
            ? "Search places…"
            : "Search apartments, schools, hospitals, gyms, workplaces…"
        }
        className={`w-full rounded-lg border border-stone-300 bg-white px-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 ${
          compact ? "py-1.5 text-sm" : "py-3"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-lg bg-primary-600 font-semibold text-white hover:bg-primary-700 ${
          compact ? "px-3 py-1.5 text-sm" : "px-5 py-3"
        }`}
      >
        Search
      </button>
    </form>
  );
}
