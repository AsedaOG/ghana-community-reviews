"use client";

import { useEffect, useState } from "react";
import type { Listing, Paginated } from "@/lib/api";
import { apiFetch } from "@/lib/client-session";

/** Debounced listing search, used for search-bar and claim-a-listing typeahead. */
export function useListingSuggestions(query: string, minLength = 2) {
  const [suggestions, setSuggestions] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < minLength) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await apiFetch<Paginated<Listing>>(
        `/listings/?q=${encodeURIComponent(q)}`
      );
      if (!cancelled) {
        setSuggestions(res.ok && res.data ? res.data.results.slice(0, 6) : []);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, minLength]);

  return { suggestions, loading };
}
