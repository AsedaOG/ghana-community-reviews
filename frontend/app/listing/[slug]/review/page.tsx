import Link from "next/link";
import { notFound } from "next/navigation";
import type { Listing } from "@/lib/api";
import { apiGet } from "@/lib/server-api";
import ReviewForm from "./ReviewForm";

export const metadata = { title: "Write a review" };

export default async function WriteReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await apiGet<Listing>(`/listings/${slug}/`);
  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm text-stone-400">
        <Link href={`/listing/${listing.slug}`} className="hover:text-primary-700">
          ← Back to {listing.name}
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-bold text-stone-900">
        Review {listing.name}
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        You stay anonymous — we generate a username for you. Adding evidence
        (kept private, admin-reviewed) can upgrade your review to a{" "}
        <strong>Verified Experience</strong>.
      </p>
      <div className="mt-6">
        <ReviewForm
          listingSlug={listing.slug}
          allowsPhotos={listing.category.allows_photos}
          categoryName={listing.category.name}
        />
      </div>
    </div>
  );
}
