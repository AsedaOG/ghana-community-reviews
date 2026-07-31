import Link from "next/link";
import type { Listing } from "@/lib/api";
import RatingStars from "./RatingStars";

export default function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/listing/${listing.slug}`}
      className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-primary-500 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
            {listing.category.icon} {listing.category.name}
          </p>
          <h3 className="mt-1 font-bold text-stone-900">{listing.name}</h3>
        </div>
        {listing.is_claimed && (
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
            Claimed
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-stone-500">
        {listing.area.name}, {listing.area.district} — {listing.area.region}
      </p>
      <p className="mt-2 line-clamp-2 text-sm text-stone-600">{listing.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <RatingStars rating={listing.average_rating} />
        <span className="text-xs text-stone-400">
          {listing.review_count} review{listing.review_count === 1 ? "" : "s"}
        </span>
      </div>
    </Link>
  );
}
