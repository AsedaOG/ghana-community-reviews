"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Paginated, Review } from "@/lib/api";
import { apiFetch, clearSession } from "@/lib/client-session";
import ReviewCard from "@/components/ReviewCard";

interface ReviewerProfile {
  username: string;
  reputation: number;
  is_trusted: boolean;
  is_blocked: boolean;
  strikes: number;
  strikes_to_block: number;
  created_at: string;
  badges: { name: string; slug: string; description: string; icon: string }[];
  review_count: number;
  has_account: boolean;
}

export default function ReviewerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ReviewerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await apiFetch<ReviewerProfile>("/reviewer/me/");
      if (res.status === 401) {
        // Session token is stale (e.g. revoked by a password change) —
        // the API is fine, this account just needs to sign in again.
        clearSession();
        router.replace("/login?next=/reviewer/profile");
        return;
      }
      if (!res.ok || !res.data) {
        setError("Could not load your profile. Is the API running?");
        return;
      }
      setProfile(res.data);
      const list = await apiFetch<Paginated<Review>>(
        `/reviews/?reviewer__username=${encodeURIComponent(res.data.username)}&ordering=-created_at`
      );
      setReviews(list.data?.results ?? []);
    })();
  }, []);

  if (error) {
    return <p className="mx-auto max-w-3xl px-4 py-16 text-sm text-red-700">{error}</p>;
  }
  if (!profile) {
    return (
      <p className="mx-auto max-w-3xl px-4 py-16 text-sm text-stone-500">
        Loading your profile…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-2xl font-bold text-white">
            {profile.username[0]}
          </span>
          <div>
            <h1 className="text-xl font-bold text-stone-900">{profile.username}</h1>
            <p className="text-xs text-stone-500">
              This is the only name other people see · member since{" "}
              {new Date(profile.created_at).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {profile.is_blocked ? (
          <p className="mt-4 rounded-lg bg-clay-500/10 px-3 py-2 text-sm text-clay-500">
            🚫{" "}
            {profile.strikes >= profile.strikes_to_block
              ? `This account was blocked automatically after ${profile.strikes} reported reviews.`
              : "This account has been blocked by moderators."}{" "}
            New reviews are disabled.
          </p>
        ) : (
          profile.strikes > 0 && (
            <p className="mt-4 rounded-lg bg-clay-500/10 px-3 py-2 text-sm text-clay-500">
              ⚠️ {profile.strikes} of {profile.strikes_to_block} warnings. A
              reported review adds a strike — reaching {profile.strikes_to_block}{" "}
              blocks your account automatically.
            </p>
          )
        )}

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-stone-50 p-3">
            <p className="text-2xl font-bold text-primary-700">{profile.reputation}</p>
            <p className="text-xs text-stone-500">Reputation</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3">
            <p className="text-2xl font-bold text-primary-700">{profile.review_count}</p>
            <p className="text-xs text-stone-500">Reviews</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3">
            <p className="text-2xl">{profile.is_trusted ? "🏅" : "💬"}</p>
            <p className="text-xs text-stone-500">
              {profile.is_trusted ? "Trusted Reviewer" : "Community member"}
            </p>
          </div>
        </div>

        <h2 className="mt-6 text-sm font-bold text-stone-700">Badges</h2>
        {profile.badges.length === 0 ? (
          <p className="mt-1 text-sm text-stone-500">
            No badges yet — they unlock as you publish reviews.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.badges.map((b) => (
              <span
                key={b.name}
                title={b.description}
                className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-600"
              >
                {b.icon} {b.name}
              </span>
            ))}
          </div>
        )}

        <p className="mt-6 rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary-800">
          🔒 Your email address is never shown next to your reviews — only{" "}
          <strong>{profile.username}</strong> is public.
        </p>
      </div>

      <h2 className="mt-10 text-lg font-bold text-stone-900">Your reviews</h2>
      {reviews === null ? (
        <p className="mt-2 text-sm text-stone-500">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">
          No published reviews yet.{" "}
          <Link href="/search" className="font-medium text-primary-700 hover:underline">
            Find a place to review →
          </Link>
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} showListing />
          ))}
        </div>
      )}
    </div>
  );
}
