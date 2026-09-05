/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Review, ReviewReply } from "@/lib/api";
import { mediaUrl } from "@/lib/api";
import { apiFetch, getSession } from "@/lib/client-session";
import type { Session } from "@/lib/session";
import RatingStars from "./RatingStars";
import VerificationBadge from "./VerificationBadge";

export default function ReviewCard({
  review,
  showListing = false,
}: {
  review: Review;
  showListing?: boolean;
}) {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => setSession(getSession()), []);
  const isOwner = !!session && session.username === review.reviewer;

  const [deleted, setDeleted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [title, setTitle] = useState(review.title);
  const [body, setBody] = useState(review.body);
  const [savedRating, setSavedRating] = useState(review.rating);
  const [savedTitle, setSavedTitle] = useState(review.title);
  const [savedBody, setSavedBody] = useState(review.body);
  const [hoverRating, setHoverRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [upvotes, setUpvotes] = useState(review.upvotes);
  const [downvotes, setDownvotes] = useState(review.downvotes);
  const [myVote, setMyVote] = useState(review.my_vote);
  const [voting, setVoting] = useState(false);
  const [replies, setReplies] = useState<ReviewReply[]>(review.replies);
  const [reported, setReported] = useState(review.reported_by_me);
  const [reporting, setReporting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setEditError("Please choose a star rating.");
      return;
    }
    setSaving(true);
    setEditError(null);
    const res = await apiFetch<{ detail?: string }>(`/reviews/${review.id}/`, {
      method: "PATCH",
      body: { rating, title: title.trim(), body: body.trim() },
    });
    setSaving(false);
    if (!res.ok) {
      setEditError(
        (res.data as { detail?: string } | null)?.detail ?? "Could not save changes."
      );
      return;
    }
    setSavedRating(rating);
    setSavedTitle(title.trim());
    setSavedBody(body.trim());
    setEditing(false);
  }

  function cancelEdit() {
    setRating(savedRating);
    setTitle(savedTitle);
    setBody(savedBody);
    setEditError(null);
    setEditing(false);
  }

  async function deleteReview() {
    if (!window.confirm("Delete this review? This can't be undone.")) return;
    setDeleting(true);
    const res = await apiFetch(`/reviews/${review.id}/`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) setDeleted(true);
  }

  async function vote(value: "up" | "down") {
    if (!session || voting) return;
    setVoting(true);
    const res = await apiFetch<{
      upvotes: number;
      downvotes: number;
      my_vote: "up" | "down" | null;
    }>(`/reviews/${review.id}/vote/`, { method: "POST", body: { value } });
    if (res.ok && res.data) {
      setUpvotes(res.data.upvotes);
      setDownvotes(res.data.downvotes);
      setMyVote(res.data.my_vote);
    }
    setVoting(false);
  }

  function toggleReport() {
    if (!session || reporting || reported) return;
    setReportOpen((v) => !v);
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    const reason = reportReason.trim();
    if (!reason || reporting) return;
    setReporting(true);
    const res = await apiFetch<{ detail?: string }>(`/reviews/${review.id}/report/`, {
      method: "POST",
      body: { reason },
    });
    setReporting(false);
    if (res.ok) {
      setReported(true);
      setReportOpen(false);
    } else {
      window.alert(
        (res.data as { detail?: string } | null)?.detail ?? "Could not submit the report."
      );
    }
  }

  const myReplyCount = session
    ? replies.filter((r) => r.reviewer === session.username).length
    : 0;
  const canReplyMore = review.can_reply_unlimited || myReplyCount < review.reply_limit;

  if (deleted) return null;

  return (
    <article className="rounded border border-stone-200 border-l-4 border-l-primary-600 bg-white p-5">
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
            {showListing && (
              <p className="mt-0.5 text-xs font-medium text-primary-700">
                at{" "}
                <a href={`/listing/${review.listing.slug}`} className="hover:underline">
                  {review.listing.name}
                </a>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && !editing && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-stone-500 hover:text-primary-700"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={deleteReview}
                className="text-xs font-medium text-stone-500 hover:text-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </>
          )}
          <VerificationBadge level={review.verification_level} />
        </div>
      </div>

      {editing ? (
        <form onSubmit={saveEdit} className="mt-3 space-y-3">
          <div className="flex gap-1 text-2xl">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${i} star${i === 1 ? "" : "s"}`}
                className={i <= (hoverRating || rating) ? "text-gold-500" : "text-stone-300"}
              >
                ★
              </button>
            ))}
          </div>
          <input
            required
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold outline-none focus:border-primary-500"
          />
          <textarea
            required
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
          {editError && <p className="text-xs text-red-600">{editError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs font-medium text-stone-500"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3">
          <RatingStars rating={savedRating} />
          <h4 className="mt-1 font-semibold text-stone-900">{savedTitle}</h4>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-600">
            {savedBody}
          </p>
          {review.has_evidence && (
            <p className="mt-2 text-xs font-medium text-primary-600">
              📎 Supporting evidence submitted for admin verification
            </p>
          )}
        </div>
      )}

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

      {review.owner_response && (
        <div className="mt-4 rounded border-l-4 border-gold-500 bg-gold-100/50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gold-600">
            Response from the business
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-stone-700">
            {review.owner_response.body}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3">
        <button
          type="button"
          disabled={!session || voting}
          onClick={() => vote("up")}
          title={session ? "I agree" : "Log in to vote"}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            myVote === "up" ? "bg-primary-100 text-primary-700" : "text-stone-500 hover:bg-stone-100"
          }`}
        >
          👍 {upvotes}
        </button>
        <button
          type="button"
          disabled={!session || voting}
          onClick={() => vote("down")}
          title={session ? "I disagree" : "Log in to vote"}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            myVote === "down" ? "bg-red-50 text-red-600" : "text-stone-500 hover:bg-stone-100"
          }`}
        >
          👎 {downvotes}
        </button>
        {!isOwner && (
          <button
            type="button"
            disabled={!session || reporting || reported}
            onClick={toggleReport}
            title={session ? "Report this review" : "Log in to report"}
            className={`ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed ${
              reported
                ? "text-clay-500 opacity-70"
                : "text-stone-400 hover:bg-stone-100 hover:text-clay-500 disabled:opacity-50"
            }`}
          >
            🚩 {reported ? "Reported" : "Report"}
          </button>
        )}
      </div>

      {reportOpen && (
        <form onSubmit={submitReport} className="mt-2 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <label className="block text-xs font-medium text-stone-600">
            Why are you reporting this review?
          </label>
          <textarea
            autoFocus
            required
            rows={2}
            maxLength={255}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="e.g. this review is fake, abusive, or about the wrong place"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={reporting || !reportReason.trim()}
              className="rounded-lg bg-clay-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {reporting ? "Submitting…" : "Submit report"}
            </button>
            <button
              type="button"
              onClick={() => {
                setReportOpen(false);
                setReportReason("");
              }}
              className="text-xs font-medium text-stone-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ReviewReplies
        reviewId={review.id}
        replies={replies}
        onReplied={(r) => setReplies((prev) => [...prev, r])}
        canReplyMore={canReplyMore}
        unlimited={review.can_reply_unlimited}
        limit={review.reply_limit}
        myReplyCount={myReplyCount}
        loggedIn={!!session}
      />
    </article>
  );
}

function ReviewReplies({
  reviewId,
  replies,
  onReplied,
  canReplyMore,
  unlimited,
  limit,
  myReplyCount,
  loggedIn,
}: {
  reviewId: number;
  replies: ReviewReply[];
  onReplied: (reply: ReviewReply) => void;
  canReplyMore: boolean;
  unlimited: boolean;
  limit: number;
  myReplyCount: number;
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    const res = await apiFetch<ReviewReply & { detail?: string }>("/replies/", {
      method: "POST",
      body: { review: reviewId, body: trimmed },
    });
    setBusy(false);
    if (!res.ok) {
      setError((res.data as { detail?: string } | null)?.detail ?? "Could not post reply.");
      return;
    }
    onReplied(res.data as ReviewReply);
    setBody("");
    setOpen(false);
  }

  return (
    <div className="mt-3">
      {replies.length > 0 && (
        <ul className="space-y-2 border-l-2 border-stone-100 pl-3">
          {replies.map((r) => (
            <li key={r.id} className="text-sm">
              <span className="font-semibold text-stone-700">{r.reviewer}</span>{" "}
              <span className="text-stone-600">{r.body}</span>
            </li>
          ))}
        </ul>
      )}

      {!loggedIn ? (
        <p className="mt-2 text-xs text-stone-400">
          <Link href="/login" className="text-primary-700 hover:underline">
            Log in
          </Link>{" "}
          to vote or reply.
        </p>
      ) : !canReplyMore ? (
        <p className="mt-2 text-xs text-stone-400">
          You&apos;ve reached the {limit}-reply limit for free accounts on this review.
        </p>
      ) : open ? (
        <form onSubmit={submit} className="mt-2 flex gap-2">
          <input
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a reply…"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-primary-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Posting…" : "Reply"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-xs font-medium text-primary-700 hover:underline"
        >
          Reply{!unlimited && ` (${limit - myReplyCount} left)`}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
