"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-session";

interface Plan {
  name: string;
  slug: string;
  price_ghs: string;
  interval: string;
  description: string;
  features: string[];
}

interface Report {
  title: string;
  slug: string;
  description: string;
  price_ghs: string;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [p, r] = await Promise.all([
        apiFetch<Plan[]>("/billing/plans/"),
        apiFetch<Report[]>("/billing/reports/"),
      ]);
      setPlans(p.data ?? []);
      setReports(r.data ?? []);
    })();
  }, []);

  async function buyReport(slug: string) {
    const res = await apiFetch<{ mode?: string; detail?: string; authorization_url?: string }>(
      "/billing/purchase-report/",
      { method: "POST", body: { report: slug } }
    );
    if (!res.ok) {
      setNotice(res.data?.detail ?? "Purchase failed.");
      return;
    }
    if (res.data?.mode === "live" && res.data.authorization_url) {
      window.location.href = res.data.authorization_url;
      return;
    }
    setNotice(
      res.data?.detail ??
        "Purchase recorded (sandbox). Download it from your dashboard."
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-stone-900">Pricing</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Reading and writing reviews is <strong>free, forever</strong> — that is
        Phase 1 and it never goes away. Businesses can optionally subscribe for
        profile tools (Phase 2), and premium market intelligence reports are
        available to anyone (Phase 3).
      </p>

      {notice && (
        <p className="mt-4 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-800">
          {notice}
        </p>
      )}

      <h2 className="mt-10 text-lg font-bold text-stone-900">
        💼 Business subscriptions
      </h2>
      {plans === null ? (
        <p className="mt-3 text-sm text-stone-500">Loading plans…</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {plans.map((p, i) => (
            <div
              key={p.slug}
              className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
                i === 1 ? "border-primary-500 ring-2 ring-primary-100" : "border-stone-200"
              }`}
            >
              {i === 1 && (
                <span className="mb-2 self-start rounded-full bg-primary-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="font-bold text-stone-900">{p.name}</h3>
              <p className="mt-1 text-2xl font-extrabold text-primary-700">
                GHS {p.price_ghs}
                <span className="text-sm font-normal text-stone-400">/{p.interval}</span>
              </p>
              <p className="mt-1 text-xs text-stone-500">{p.description}</p>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-stone-600">
                {p.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <Link
                href="/business/dashboard"
                className="mt-5 rounded-lg bg-primary-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-700"
              >
                Subscribe from your dashboard
              </Link>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-12 text-lg font-bold text-stone-900">
        📊 Market intelligence reports
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        Aggregated, anonymised insight from thousands of community reviews.
      </p>
      {reports === null ? (
        <p className="mt-3 text-sm text-stone-500">Loading reports…</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {reports.map((r) => (
            <div key={r.slug} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-stone-900">{r.title}</h3>
              <p className="mt-2 flex-1 text-sm text-stone-600">{r.description}</p>
              <p className="mt-3 text-lg font-bold text-primary-700">GHS {r.price_ghs}</p>
              <button
                onClick={() => buyReport(r.slug)}
                className="mt-3 rounded-lg border border-primary-600 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
              >
                Buy report
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
