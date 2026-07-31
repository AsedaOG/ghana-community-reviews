"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  API_URL,
  mediaUrl,
  type AreaOption,
  type Category,
  type ListingRequest,
  type Region,
} from "@/lib/api";
import { apiFetch } from "@/lib/client-session";

interface Claim {
  id: number;
  listing: { name: string; slug: string };
  contact_name: string;
  email: string;
  message: string;
  created_at: string;
}

interface EvidenceItem {
  id: number;
  review_id: number;
  review_title: string;
  listing: string;
  reviewer: string;
  file: string | null;
  note: string;
  uploaded_at: string;
}

interface FlaggedReview {
  id: number;
  title: string;
  body: string;
  rating: number;
  reviewer: string;
  listing: { name: string; slug: string };
}

interface Queue {
  pending_claims: Claim[];
  unreviewed_evidence: EvidenceItem[];
  flagged_reviews: FlaggedReview[];
}

interface ReviewerRow {
  id: number;
  username: string;
  reputation: number;
  review_count: number;
  is_trusted: boolean;
  is_blocked: boolean;
  has_account: boolean;
}

export default function AdminPanelPage() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<Queue>("/moderation/queue/");
    if (res.status === 401 || res.status === 403) {
      setError("You need a staff account to view the moderation panel.");
      return;
    }
    if (!res.ok) {
      setError("Could not load the moderation queue. Is the API running?");
      return;
    }
    setQueue(res.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decideClaim(id: number, decision: "approve" | "reject") {
    await apiFetch(`/moderation/claims/${id}/`, { method: "POST", body: { decision } });
    load();
  }

  async function decideEvidence(id: number, verified: boolean) {
    await apiFetch(`/moderation/evidence/${id}/`, { method: "POST", body: { verified } });
    load();
  }

  async function moderateReview(id: number, action: "remove" | "restore") {
    await apiFetch(`/moderation/reviews/${id}/`, { method: "POST", body: { action } });
    load();
  }

  if (error) {
    return (
      <p className="mx-auto max-w-4xl px-4 py-16 text-sm text-red-700">{error}</p>
    );
  }
  if (!queue) {
    return (
      <p className="mx-auto max-w-4xl px-4 py-16 text-sm text-stone-500">
        Loading moderation queue…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Moderation panel</h1>
          <p className="text-sm text-stone-500">
            Claims, evidence and disputes. Full admin at{" "}
            <a
              href={`${API_URL.replace(/\/api$/, "")}/admin/`}
              className="text-primary-700 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Django admin ↗
            </a>
          </p>
        </div>
      </div>

      {/* Direct listing creation */}
      <CreateListingForm />

      {/* Member-suggested listings */}
      <ListingRequestModeration />

      {/* Pending claims */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-stone-900">
          Pending business claims ({queue.pending_claims.length})
        </h2>
        {queue.pending_claims.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">Nothing pending. 🎉</p>
        ) : (
          <div className="mt-3 space-y-3">
            {queue.pending_claims.map((c) => (
              <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-800">
                    {c.listing.name}
                    <span className="ml-2 font-normal text-stone-500">
                      by {c.contact_name} ({c.email})
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => decideClaim(c.id, "approve")}
                      className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => decideClaim(c.id, "reject")}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                {c.message && <p className="mt-2 text-sm text-stone-600">“{c.message}”</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Evidence */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-stone-900">
          Evidence awaiting verification ({queue.unreviewed_evidence.length})
        </h2>
        {queue.unreviewed_evidence.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">All evidence reviewed.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {queue.unreviewed_evidence.map((e) => (
              <div key={e.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-stone-700">
                    <span className="font-semibold">{e.listing}</span> — “{e.review_title}” by{" "}
                    {e.reviewer}
                    {e.file && (
                      <a
                        href={mediaUrl(e.file)}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-primary-700 hover:underline"
                      >
                        View file ↗
                      </a>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => decideEvidence(e.id, true)}
                      className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                    >
                      Verify → upgrade review
                    </button>
                    <button
                      onClick={() => decideEvidence(e.id, false)}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                    >
                      Mark reviewed, don&apos;t verify
                    </button>
                  </div>
                </div>
                {e.note && <p className="mt-1 text-xs text-stone-500">Note: {e.note}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reviewers */}
      <ReviewerModeration />

      {/* Flagged reviews */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-stone-900">
          Flagged reviews ({queue.flagged_reviews.length})
        </h2>
        {queue.flagged_reviews.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No open disputes.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {queue.flagged_reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-800">
                    {r.listing.name} · {r.rating}★ · “{r.title}” by {r.reviewer}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => moderateReview(r.id, "restore")}
                      className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => moderateReview(r.id, "remove")}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-stone-600">{r.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CreateListingForm() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);

  const [categorySlug, setCategorySlug] = useState("");
  const [regionId, setRegionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!open || categories.length) return;
    (async () => {
      const [cats, regs] = await Promise.all([
        apiFetch<Category[]>("/categories/"),
        apiFetch<Region[]>("/regions/"),
      ]);
      setCategories(cats.data ?? []);
      setRegions(regs.data ?? []);
    })();
  }, [open, categories.length]);

  useEffect(() => {
    if (!districtId) {
      setAreas([]);
      return;
    }
    (async () => {
      const res = await apiFetch<AreaOption[]>(`/areas/?district=${districtId}`);
      setAreas(res.data ?? []);
    })();
  }, [districtId]);

  const region = regions.find((r) => String(r.id) === regionId);
  const district = region?.districts.find((d) => String(d.id) === districtId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categorySlug || !areaId || !name) {
      setError("Category, area and name are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ slug?: string; detail?: string }>("/listings/", {
        method: "POST",
        body: {
          category_slug: categorySlug,
          area_id: Number(areaId),
          name,
          address,
          description,
        },
      });
      if (!res.ok) {
        setError(res.data?.detail ?? "Could not create the listing.");
        return;
      }
      setCreatedSlug(res.data?.slug ?? null);
      setCategorySlug("");
      setRegionId("");
      setDistrictId("");
      setAreaId("");
      setName("");
      setAddress("");
      setDescription("");
    } catch {
      setError("Could not reach the server. Is the API running?");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-primary-500";
  const label = "block text-xs font-semibold text-stone-600";

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-900">Create a listing</h2>
        <button
          onClick={() => {
            setOpen((v) => !v);
            setCreatedSlug(null);
          }}
          className="rounded-lg border border-primary-600 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
        >
          {open ? "Close" : "+ New listing"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Category
              <select
                required
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className={input}
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={input}
              />
            </label>
            <label className={label}>
              Region
              <select
                required
                value={regionId}
                onChange={(e) => {
                  setRegionId(e.target.value);
                  setDistrictId("");
                  setAreaId("");
                }}
                className={input}
              >
                <option value="">Select…</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              District
              <select
                required
                disabled={!region}
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value);
                  setAreaId("");
                }}
                className={input}
              >
                <option value="">{region ? "Select…" : "Choose a region first"}</option>
                {region?.districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Area
              <select
                required
                disabled={!district}
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className={input}
              >
                <option value="">{district ? "Select…" : "Choose a district first"}</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Address <span className="font-normal text-stone-400">(optional)</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={input}
              />
            </label>
          </div>
          <label className={label}>
            Description <span className="font-normal text-stone-400">(optional)</span>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={input}
            />
          </label>

          {error && <p className="text-xs text-red-700">{error}</p>}
          {createdSlug && (
            <p className="text-xs text-primary-700">
              Listing created —{" "}
              <Link href={`/listing/${createdSlug}`} className="font-semibold hover:underline">
                view it →
              </Link>
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create listing"}
          </button>
        </form>
      )}
    </section>
  );
}

function ListingRequestModeration() {
  const [requests, setRequests] = useState<ListingRequest[] | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const res = await apiFetch<ListingRequest[]>("/moderation/listing-requests/?status=pending");
    if (res.ok) setRequests(res.data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: number, decision: "approve" | "reject") {
    await apiFetch(`/moderation/listing-requests/${id}/`, {
      method: "POST",
      body: { decision, admin_note: noteDrafts[id] ?? "" },
    });
    load();
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-stone-900">
        Member-suggested listings {requests ? `(${requests.length})` : ""}
      </h2>
      <p className="mt-1 text-xs text-stone-500">
        Approving creates the area (if new) and the listing immediately.
      </p>
      {requests === null ? (
        <p className="mt-3 text-sm text-stone-500">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">Nothing pending. 🎉</p>
      ) : (
        <div className="mt-3 space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-stone-800">
                    {r.category.icon} {r.name}
                  </p>
                  <p className="text-xs text-stone-500">
                    {r.location.area}, {r.location.district}, {r.location.region}
                    {r.requester_email && ` · suggested by ${r.requester_email}`}
                  </p>
                  {r.description && (
                    <p className="mt-1 text-sm text-stone-600">{r.description}</p>
                  )}
                  {r.address && (
                    <p className="mt-1 text-xs text-stone-400">📍 {r.address}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => decide(r.id, "approve")}
                    className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decide(r.id, "reject")}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
              <input
                value={noteDrafts[r.id] ?? ""}
                onChange={(e) => setNoteDrafts({ ...noteDrafts, [r.id]: e.target.value })}
                placeholder="Optional note (shown to the requester if rejected)"
                className="mt-2 w-full rounded-lg border border-stone-200 px-2 py-1 text-xs outline-none focus:border-primary-500"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewerModeration() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ReviewerRow[] | null>(null);

  const search = useCallback(async (query: string) => {
    const res = await apiFetch<ReviewerRow[]>(
      `/moderation/reviewers/${query ? `?q=${encodeURIComponent(query)}` : ""}`
    );
    if (res.ok) setRows(res.data ?? []);
  }, []);

  useEffect(() => {
    search("");
  }, [search]);

  async function toggleBlock(row: ReviewerRow) {
    await apiFetch(`/moderation/reviewers/${row.id}/`, {
      method: "POST",
      body: { action: row.is_blocked ? "unblock" : "block" },
    });
    search(q);
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-stone-900">Reviewers</h2>
      <p className="mt-1 text-xs text-stone-500">
        Blocking stops new reviews immediately and disables the reviewer&apos;s
        login if they have an account. Existing reviews stay up — flag or
        remove them individually above.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(q);
        }}
        className="mt-3 flex max-w-sm gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search usernames…"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-primary-500"
        />
        <button className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700">
          Search
        </button>
      </form>
      {rows === null ? (
        <p className="mt-3 text-sm text-stone-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No reviewers found.</p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <span className="text-sm">
                <span className={`font-semibold ${r.is_blocked ? "text-red-600 line-through" : "text-stone-800"}`}>
                  {r.username}
                </span>
                <span className="ml-2 text-xs text-stone-400">
                  {r.review_count} reviews · {r.reputation} rep
                  {r.is_trusted && " · 🏅 trusted"}
                  {r.has_account && " · has account"}
                </span>
              </span>
              <button
                onClick={() => toggleBlock(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  r.is_blocked
                    ? "bg-primary-600 text-white hover:bg-primary-700"
                    : "border border-red-300 text-red-600 hover:bg-red-50"
                }`}
              >
                {r.is_blocked ? "Unblock" : "Block"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
