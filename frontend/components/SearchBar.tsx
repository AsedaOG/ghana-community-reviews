"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useListingSuggestions } from "@/lib/useListingSuggestions";

export default function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { suggestions } = useListingSuggestions(q);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setOpen(false);
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  function goToListing(slug: string) {
    setOpen(false);
    router.push(`/listing/${slug}`);
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <form onSubmit={submit} role="search" className="flex w-full gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          autoComplete="off"
          placeholder={
            compact
              ? "Search places…"
              : "Search apartments, schools, hospitals, gyms, workplaces…"
          }
          className={`w-full rounded-lg border border-stone-300 bg-white px-3 text-stone-900 placeholder:text-stone-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 ${
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

      {open && q.trim().length >= 2 && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
          {suggestions.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => goToListing(l.slug)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-stone-50"
              >
                <span className="text-lg">{l.category.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-stone-800">
                    {l.name}
                  </span>
                  <span className="block truncate text-xs text-stone-400">
                    {l.area.name}, {l.area.region} Region
                  </span>
                </span>
              </button>
            </li>
          ))}
          <li className="border-t border-stone-100">
            <button
              type="button"
              onClick={submit}
              className="block w-full px-3 py-2 text-left text-sm font-medium text-primary-700 hover:bg-stone-50"
            >
              See all results for “{q.trim()}” →
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
