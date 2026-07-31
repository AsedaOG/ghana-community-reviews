/* eslint-disable @next/next/no-img-element */
import type { Review } from "@/lib/api";
import { mediaUrl } from "@/lib/api";
import RatingStars from "./RatingStars";
import VerificationBadge from "./VerificationBadge";

export default function ReviewCard({
  review,
  showListing = false,
}: {
  review: Review;
  showListing?: boolean;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
            {review.reviewer[0]}
          </span>
          <div>
            <p className="text-sm font-semibold text-stone-800">
              {review.reviewer}
              {review.reviewer_badges.map((b) => (
                <span key={b.name} title={b.name} className="ml-1">
                  {b.icon}
                </span>
              ))}
            </p>
            <p className="text-xs text-stone-400">
              {new Date(review.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <VerificationBadge level={review.verification_level} />
      </div>

      <div className="mt-3">
        <RatingStars rating={review.rating} />
        <h4 className="mt-1 font-semibold text-stone-900">{review.title}</h4>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-600">
          {review.body}
        </p>
        {review.has_evidence && (
          <p className="mt-2 text-xs font-medium text-primary-600">
            📎 Supporting evidence submitted for admin verification
          </p>
        )}
      </div>

      {review.photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.photos.map((p) => (
            <img
              key={p.id}
              src={mediaUrl(p.image)}
              alt={p.caption || "Review photo"}
              className="h-24 w-24 shrink-0 rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {showListing && (
        <p className="mt-3 text-xs text-stone-500">
          Reviewing:{" "}
          <a href={`/listing/${review.listing.slug}`} className="font-medium text-primary-700 hover:underline">
            {review.listing.name}
          </a>
        </p>
      )}

      {review.owner_response && (
        <div className="mt-4 rounded-lg border-l-4 border-gold-400 bg-gold-100/50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gold-600">
            Response from the business
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-stone-700">
            {review.owner_response.body}
          </p>
        </div>
      )}
    </article>
  );
}
