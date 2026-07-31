import Link from "next/link";
import { notFound } from "next/navigation";
import type { Listing, Paginated, Review } from "@/lib/api";
import { apiGet } from "@/lib/server-api";
import RatingStars from "@/components/RatingStars";
import ReviewCard from "@/components/ReviewCard";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [listing, reviews] = await Promise.all([
    apiGet<Listing>(`/listings/${slug}/`),
    apiGet<Paginated<Review>>(`/reviews/?listing__slug=${slug}&ordering=-created_at`),
  ]);
  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm text-stone-400">
        <Link href="/" className="hover:text-primary-700">Home</Link> /{" "}
        <Link href={`/category/${listing.category.slug}`} className="hover:text-primary-700">
          {listing.category.name}
        </Link>{" "}
        / {listing.name}
      </p>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
              {listing.category.icon} {listing.category.name}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-stone-900">{listing.name}</h1>
            <p className="mt-1 text-sm text-stone-500">
              📍 {listing.address && `${listing.address} · `}
              {listing.area.name}, {listing.area.district}, {listing.area.region} Region
            </p>
          </div>
          <div className="text-right">
            <RatingStars rating={listing.average_rating} size="text-xl" />
            <p className="mt-1 text-xs text-stone-400">
              {listing.review_count} review{listing.review_count === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {listing.description && (
          <p className="mt-4 text-sm leading-relaxed text-stone-600">{listing.description}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={`/listing/${listing.slug}/review`}
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            ✍️ Write a review
          </Link>
          {listing.is_claimed ? (
            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
              ✓ Claimed by the business
            </span>
          ) : (
            <Link
              href="/for-business"
              className="text-sm font-medium text-stone-500 hover:text-primary-700"
            >
              Own this place? Claim it →
            </Link>
          )}
        </div>
      </div>

      <h2 className="mt-10 text-lg font-bold text-stone-900">
        Reviews {reviews ? `(${reviews.count})` : ""}
      </h2>
      <div className="mt-4 space-y-4">
        {reviews && reviews.results.length > 0 ? (
          reviews.results.map((r) => <ReviewCard key={r.id} review={r} />)
        ) : (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
            No reviews yet — share your experience anonymously.
          </p>
        )}
      </div>
    </div>
  );
}
