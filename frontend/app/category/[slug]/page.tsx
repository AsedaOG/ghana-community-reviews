import Link from "next/link";
import { notFound } from "next/navigation";
import type { Category, Listing, Paginated, Region } from "@/lib/api";
import { apiGet } from "@/lib/server-api";
import ListingCard from "@/components/ListingCard";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ region?: string }>;
}) {
  const { slug } = await params;
  const { region } = await searchParams;

  const [category, regions] = await Promise.all([
    apiGet<Category>(`/categories/${slug}/`),
    apiGet<Region[]>("/regions/"),
  ]);
  if (!category) notFound();

  const query = new URLSearchParams({ category__slug: slug });
  if (region) query.set("area__district__region__slug", region);
  const listings = await apiGet<Paginated<Listing>>(`/listings/?${query}`);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm text-stone-400">
        <Link href="/" className="hover:text-primary-700">Home</Link> / {category.name}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-4xl">{category.icon}</span>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{category.name}</h1>
          <p className="text-sm text-stone-500">{category.description}</p>
        </div>
      </div>
      {!category.allows_photos && (
        <p className="mt-3 rounded-lg bg-gold-100 px-3 py-2 text-sm text-gold-600">
          🔒 To protect reviewer anonymity, photo uploads are disabled for
          workplace reviews.
        </p>
      )}

      {/* Region filter */}
      {regions && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/category/${slug}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              !region
                ? "bg-primary-600 text-white"
                : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-primary-500"
            }`}
          >
            All Ghana
          </Link>
          {regions.map((r) => (
            <Link
              key={r.slug}
              href={`/category/${slug}?region=${r.slug}`}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                region === r.slug
                  ? "bg-primary-600 text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-primary-500"
              }`}
            >
              {r.name}
            </Link>
          ))}
        </div>
      )}

      {listings && listings.results.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.results.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
          No listings here yet.{" "}
          <Link
            href={`/listings/request?category=${slug}`}
            className="font-medium text-primary-700 hover:underline"
          >
            Suggest one →
          </Link>
        </p>
      )}
    </div>
  );
}
