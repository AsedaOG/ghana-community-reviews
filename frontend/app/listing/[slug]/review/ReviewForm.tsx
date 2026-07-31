"use client";

import Link from "next/link";
import { useState } from "react";
import { API_URL } from "@/lib/api";
import { getSession } from "@/lib/client-session";

export default function ReviewForm({
  listingSlug,
  allowsPhotos,
  categoryName,
}: {
  listingSlug: string;
  allowsPhotos: boolean;
  categoryName: string;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [evidence, setEvidence] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneUsername, setDoneUsername] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating === 0) {
      setError("Please choose a star rating.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("listing_slug", listingSlug);
      fd.set("rating", String(rating));
      fd.set("title", title);
      fd.set("body", body);
      if (allowsPhotos && photos) {
        Array.from(photos).slice(0, 5).forEach((f) => fd.append("photos", f));
      }
      if (evidence) {
        Array.from(evidence).slice(0, 5).forEach((f) => fd.append("evidence", f));
      }

      const session = getSession();
      const res = await fetch(`${API_URL}/reviews/`, {
        method: "POST",
        // FormData sets its own Content-Type boundary — only add auth here.
        headers: session ? { Authorization: `Token ${session.token}` } : undefined,
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.detail ??
            Object.values(data ?? {}).flat().join(" ") ??
            "Something went wrong. Please try again."
        );
        return;
      }
      setDoneUsername(data.reviewer);
    } catch {
      setError("Could not reach the server. Is the API running?");
    } finally {
      setSubmitting(false);
    }
  }

  if (doneUsername) {
    return (
      <div className="rounded-2xl border border-primary-100 bg-primary-50 p-8 text-center">
        <p className="text-4xl">🎉</p>
        <h2 className="mt-2 text-lg font-bold text-primary-800">Review published!</h2>
        <p className="mt-2 text-sm text-stone-600">
          Published under your anonymous username{" "}
          <span className="font-bold text-primary-700">{doneUsername}</span> —
          the business sees that name, never your email. Your reputation and
          badges grow with each review.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link
            href={`/listing/${listingSlug}`}
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            See your review
          </Link>
          <Link
            href="/reviewer/profile"
            className="rounded-lg border border-primary-600 px-5 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            View my profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div>
        <label className="block text-sm font-semibold text-stone-700">Your rating</label>
        <div className="mt-1 flex gap-1 text-3xl">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${i} star${i === 1 ? "" : "s"}`}
              className={
                i <= (hover || rating) ? "text-gold-500" : "text-stone-300"
              }
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-stone-700">
          Title
        </label>
        <input
          id="title"
          required
          maxLength={150}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum up your experience in one line"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-semibold text-stone-700">
          Your experience
        </label>
        <textarea
          id="body"
          required
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What should others know? Be honest, specific and fair."
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      {allowsPhotos ? (
        <div>
          <label htmlFor="photos" className="block text-sm font-semibold text-stone-700">
            Photos <span className="font-normal text-stone-400">(optional, up to 5)</span>
          </label>
          <input
            id="photos"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(e.target.files)}
            className="mt-1 block w-full text-sm text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-700"
          />
        </div>
      ) : (
        <p className="rounded-lg bg-gold-100 px-3 py-2 text-sm text-gold-600">
          🔒 Photo uploads are disabled for {categoryName.toLowerCase()} reviews
          to protect your anonymity.
        </p>
      )}

      <div>
        <label htmlFor="evidence" className="block text-sm font-semibold text-stone-700">
          Evidence <span className="font-normal text-stone-400">(optional, private)</span>
        </label>
        <p className="text-xs text-stone-400">
          e.g. tenancy agreement, payslip, admission letter, receipt. Only admins
          see it — used to mark your review a Verified Experience.
        </p>
        <input
          id="evidence"
          type="file"
          multiple
          onChange={(e) => setEvidence(e.target.files)}
          className="mt-1 block w-full text-sm text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-stone-600"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {submitting ? "Publishing…" : "Publish anonymously"}
      </button>
    </form>
  );
}
