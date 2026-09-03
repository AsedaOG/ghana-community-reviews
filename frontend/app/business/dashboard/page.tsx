"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Listing, Review } from "@/lib/api";
import { apiFetch, getSession } from "@/lib/client-session";
import { useListingSuggestions } from "@/lib/useListingSuggestions";
import { PRICING_ENABLED } from "@/lib/features";

interface Claim {
  id: number;
  listing: { name: string; slug: string };
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface Overview {
  claims: Claim[];
  listings: Listing[];
  reviews: Review[];
}

interface Plan {
  name: string;
  slug: string;
  price_ghs: string;
  interval: string;
  description: string;
  features: string[];
}

interface Billing {
  provider_configured: boolean;
  subscription: {
    plan: Plan;
    status: string;
    current_period_end: string | null;
  } | null;
  purchased_reports: { title: string; slug: string }[];
  payments: { id: number; purpose: string; amount_ghs: string; status: string; created_at: string }[];
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!PRICING_ENABLED) {
      const ov = await apiFetch<Overview>("/owner/overview/");
      if (!ov.ok) {
        setError("Could not load your dashboard. Is the API running?");
        return;
      }
      setOverview(ov.data);
      return;
    }
    const [ov, bill, planList] = await Promise.all([
      apiFetch<Overview>("/owner/overview/"),
      apiFetch<Billing>("/billing/status/"),
      apiFetch<Plan[]>("/billing/plans/"),
    ]);
    if (!ov.ok) {
      setError("Could not load your dashboard. Is the API running?");
      return;
    }
    setOverview(ov.data);
    setBilling(bill.data);
    setPlans(planList.data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function subscribe(planSlug: string) {
    setNotice(null);
    const res = await apiFetch<{ mode: string; detail?: string; authorization_url?: string }>(
      "/billing/subscribe/",
      { method: "POST", body: { plan: planSlug } }
    );
    if (!res.ok) {
      setNotice((res.data as { detail?: string } | null)?.detail ?? "Subscription failed.");
      return;
    }
    if (res.data?.mode === "live" && res.data.authorization_url) {
      window.location.href = res.data.authorization_url;
      return;
    }
    setNotice(res.data?.detail ?? "Subscription activated (sandbox).");
    load();
  }

  if (error) {
    return <p className="mx-auto max-w-4xl px-4 py-16 text-sm text-red-700">{error}</p>;
  }
  if (!overview) {
    return <p className="mx-auto max-w-4xl px-4 py-16 text-sm text-stone-500">Loading dashboard…</p>;
  }

  const session = getSession();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {session?.name || "Business dashboard"}
          </h1>
          <p className="text-sm text-stone-500">{session?.email}</p>
        </div>
      </div>

      {notice && (
        <p className="mt-4 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-800">
          {notice}
        </p>
      )}

      {/* Claims */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Your claims</h2>
          <ClaimBox onClaimed={load} />
        </div>
        {overview.claims.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
            No claims yet. Find your business via{" "}
            <Link href="/search" className="text-primary-700 hover:underline">search</Link>{" "}
            and claim it with its listing slug.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {overview.claims.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <Link
                  href={`/listing/${c.listing.slug}`}
                  className="text-sm font-semibold text-stone-800 hover:text-primary-700"
                >
                  {c.listing.name}
                </Link>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    c.status === "approved"
                      ? "bg-primary-100 text-primary-700"
                      : c.status === "pending"
                        ? "bg-gold-100 text-gold-600"
                        : "bg-red-50 text-red-600"
                  }`}
                >
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reviews needing response */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-stone-900">Reviews on your listings</h2>
        {overview.reviews.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            No reviews yet on your approved listings.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {overview.reviews.map((r) => (
              <OwnerReviewCard key={r.id} review={r} onResponded={load} />
            ))}
          </div>
        )}
      </section>

      {/* Billing */}
      {PRICING_ENABLED && (
      <section className="mt-10">
        <h2 className="text-lg font-bold text-stone-900">Subscription</h2>
        {billing?.provider_configured === false && (
          <p className="mt-2 rounded-lg bg-gold-100 px-3 py-2 text-xs text-gold-600">
            Payments run in sandbox mode — no provider keys configured yet, so
            subscriptions activate without charging.
          </p>
        )}
        {billing?.subscription ? (
          <div className="mt-3 rounded-xl border border-primary-500 bg-primary-50 p-5">
            <p className="font-semibold text-primary-800">
              {billing.subscription.plan.name} — GHS {billing.subscription.plan.price_ghs}/
              {billing.subscription.plan.interval}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Status: <strong>{billing.subscription.status}</strong>
              {billing.subscription.current_period_end &&
                ` · renews ${new Date(billing.subscription.current_period_end).toLocaleDateString("en-GB")}`}
            </p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {plans.map((p) => (
              <div key={p.slug} className="flex flex-col rounded-xl border border-stone-200 bg-white p-5">
                <h3 className="font-semibold text-stone-900">{p.name}</h3>
                <p className="mt-1 text-xl font-bold text-primary-700">
                  GHS {p.price_ghs}
                  <span className="text-sm font-normal text-stone-400">/{p.interval}</span>
                </p>
                <ul className="mt-2 flex-1 space-y-1 text-xs text-stone-600">
                  {p.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <button
                  onClick={() => subscribe(p.slug)}
                  className="mt-4 rounded-lg bg-primary-600 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  Subscribe
                </button>
              </div>
            ))}
          </div>
        )}

        {billing && billing.payments.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-stone-700">Payment history</h3>
            <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white text-sm">
              {billing.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-2">
                  <span className="text-stone-600">
                    {p.purpose} · GHS {p.amount_ghs}
                  </span>
                  <span className="text-xs text-stone-400">
                    {p.status} · {new Date(p.created_at).toLocaleDateString("en-GB")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      )}
    </div>
  );
}

function ClaimBox({ onClaimed }: { onClaimed: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ slug: string; name: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions } = useListingSuggestions(query);
  const boxRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError("Search for your business and pick it from the suggestions.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await apiFetch<{ detail?: string; listing_slug?: string[] }>(
      "/owner/claim/",
      { method: "POST", body: { listing_slug: selected.slug, message } }
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.data?.detail ?? res.data?.listing_slug?.[0] ?? "Claim failed — check the listing.");
      return;
    }
    setOpen(false);
    setQuery("");
    setSelected(null);
    setMessage("");
    onClaimed();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-primary-600 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
      >
        + Claim a listing
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-full rounded-xl border border-stone-200 bg-white p-4 sm:max-w-md"
    >
      <div ref={boxRef} className="relative">
        <input
          required
          value={selected ? selected.name : query}
          onChange={(e) => {
            setSelected(null);
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          autoComplete="off"
          placeholder="Search for your business by name…"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
        />
        {showSuggestions && !selected && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
            {suggestions.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected({ slug: l.slug, name: l.name });
                    setShowSuggestions(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-stone-50"
                >
                  <span className="text-lg">{l.category.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-stone-800">
                      {l.name}
                    </span>
                    <span className="block truncate text-xs text-stone-400">
                      {l.area.name}, {l.area.region} Region
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <textarea
        rows={2}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="How are you connected to this business?"
        className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
      />
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit claim"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-stone-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function OwnerReviewCard({ review, onResponded }: { review: Review; onResponded: () => void }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await apiFetch<{ detail?: string }>("/owner/respond/", {
      method: "POST",
      body: { review: review.id, body },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.data?.detail ?? "Could not post the response.");
      return;
    }
    onResponded();
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-800">
          {review.listing.name} · {"★".repeat(review.rating)}
          <span className="text-stone-300">{"★".repeat(5 - review.rating)}</span>
        </p>
        <span className="text-xs text-stone-400">
          {review.reviewer} · {new Date(review.created_at).toLocaleDateString("en-GB")}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-stone-700">{review.title}</p>
      <p className="mt-1 text-sm text-stone-600">{review.body}</p>
      {review.owner_response ? (
        <p className="mt-2 rounded-lg bg-gold-100/50 px-3 py-2 text-sm text-stone-700">
          <span className="text-xs font-bold uppercase text-gold-600">Your response: </span>
          {review.owner_response.body}
        </p>
      ) : (
        <form onSubmit={respond} className="mt-3 flex gap-2">
          <input
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a public response…"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-primary-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "…" : "Respond"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
