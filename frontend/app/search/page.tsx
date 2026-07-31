import Link from "next/link";
import type { Listing, Paginated } from "@/lib/api";
import { apiGet } from "@/lib/server-api";
import ListingCard from "@/components/ListingCard";
import SearchBar from "@/components/SearchBar";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const path = q ? `/listings/?q=${encodeURIComponent(q)}` : "/listings/";
  const listings = await apiGet<Paginated<Listing>>(path);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-stone-900">
        {q ? `Results for “${q}”` : "All listings"}
      </h1>
      <div className="mt-4">
        <SearchBar />
      </div>
      {listings ? (
        listings.results.length > 0 ? (
          <>
            <p className="mt-6 text-sm text-stone-500">
              {listings.count} result{listings.count === 1 ? "" : "s"}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.results.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </>
        ) : (
          <p className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
            Nothing matched. Try a place name, an area (e.g. “Osu”), or a
            different spelling.{" "}
            <Link href="/listings/request" className="font-medium text-primary-700 hover:underline">
              Can&apos;t find it? Suggest a new listing →
            </Link>
          </p>
        )
      ) : (
        <p className="mt-8 text-sm text-stone-500">The API is not reachable.</p>
      )}
    </div>
  );
}
