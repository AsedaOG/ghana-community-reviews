"use client";

import { useEffect, useState } from "react";
import type { AreaOption, Category, ListingRequest, Region } from "@/lib/api";
import { apiFetch } from "@/lib/client-session";

const OTHER_AREA = "__other__";

export default function RequestListingPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [mine, setMine] = useState<ListingRequest[] | null>(null);

  const [categorySlug, setCategorySlug] = useState("");
  const [regionId, setRegionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [newAreaName, setNewAreaName] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function loadMine() {
    const res = await apiFetch<ListingRequest[]>("/listing-requests/");
    if (res.ok) setMine(res.data ?? []);
  }

  useEffect(() => {
    (async () => {
      const [cats, regs] = await Promise.all([
        apiFetch<Category[]>("/categories/"),
        apiFetch<Region[]>("/regions/"),
      ]);
      setCategories(cats.data ?? []);
      setRegions(regs.data ?? []);
    })();
    loadMine();
  }, []);

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

    if (!categorySlug || !regionId || !districtId) {
      setError("Please choose a category, region and district.");
      return;
    }
    if (areaId !== OTHER_AREA && !areaId) {
      setError("Please choose an area, or select “My area isn't listed”.");
      return;
    }
    if (areaId === OTHER_AREA && !newAreaName.trim()) {
      setError("Please type the name of your area.");
      return;
    }

    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        category_slug: categorySlug,
        region_id: Number(regionId),
        district_id: Number(districtId),
        name,
        address,
        description,
      };
      if (areaId === OTHER_AREA) {
        body.new_area_name = newAreaName.trim();
      } else {
        body.area_id = Number(areaId);
      }

      const res = await apiFetch<{ detail?: string }>("/listing-requests/", {
        method: "POST",
        body,
      });
      if (!res.ok) {
        const data = res.data as Record<string, unknown> | null;
        const firstError =
          data && typeof data === "object"
            ? (Object.values(data).flat()[0] as string | undefined)
            : undefined;
        setError(firstError ?? "Could not submit your request.");
        return;
      }
      setDone(true);
      setName("");
      setAddress("");
      setDescription("");
      setCategorySlug("");
      setRegionId("");
      setDistrictId("");
      setAreaId("");
      setNewAreaName("");
      loadMine();
    } catch {
      setError("Could not reach the server. Is the API running?");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100";
  const label = "block text-sm font-semibold text-stone-700";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-stone-900">Suggest a listing</h1>
      <p className="mt-1 text-sm text-stone-500">
        Can&apos;t find the apartment, workplace, school, hospital or gym you
        want to review? Suggest it here — an administrator reviews every
        request before it goes live.
      </p>

      <form
        onSubmit={submit}
        className="mt-6 space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            Category
            <select
              required
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className={input}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className={label}>
            Name of the place
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Golden Gate Apartments"
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
              <option value="">Select a region</option>
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
              <option value="">
                {region ? "Select a district" : "Choose a region first"}
              </option>
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
              <option value="">
                {district ? "Select an area" : "Choose a district first"}
              </option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              {district && <option value={OTHER_AREA}>My area isn&apos;t listed…</option>}
            </select>
          </label>

          {areaId === OTHER_AREA && (
            <label className={label}>
              New area name
              <input
                required
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="e.g. Spintex"
                className={input}
              />
            </label>
          )}
        </div>

        <label className={label}>
          Street address <span className="font-normal text-stone-400">(optional)</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={input}
          />
        </label>

        <label className={label}>
          Why should this be added?{" "}
          <span className="font-normal text-stone-400">(optional, helps the reviewer)</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of the place"
            className={input}
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {done && (
          <p className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-800">
            Thanks! Your suggestion is pending admin review — track its status below.
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary-600 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit suggestion"}
        </button>
      </form>

      <h2 className="mt-10 text-lg font-bold text-stone-900">Your suggestions</h2>
      {mine === null ? (
        <p className="mt-2 text-sm text-stone-500">Loading…</p>
      ) : mine.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">You haven&apos;t suggested anything yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {mine.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-stone-200 bg-white px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-stone-800">
                  {r.category.icon} {r.name}
                  <span className="ml-2 font-normal text-stone-400">
                    {r.location.area}, {r.location.district}
                  </span>
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    r.status === "approved"
                      ? "bg-primary-100 text-primary-700"
                      : r.status === "pending"
                        ? "bg-gold-100 text-gold-600"
                        : "bg-red-50 text-red-600"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              {r.status === "rejected" && r.admin_note && (
                <p className="mt-1 text-xs text-stone-500">Reason: {r.admin_note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
