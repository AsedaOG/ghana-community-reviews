import Link from "next/link";
import { PRICING_ENABLED } from "@/lib/features";

export const metadata = { title: "For Business" };

const STEPS = [
  { n: "1", t: "Create a business account", d: "Register with your business email and verify it with the link we send you." },
  { n: "2", t: "Claim your listing", d: "Find your business and claim it from your dashboard, with proof of your connection." },
  { n: "3", t: "Get verified", d: "Our admins review the claim — you'll see the status change on your dashboard." },
  { n: "4", t: "Respond publicly", d: "Reply to reviews under your business name and keep your profile information accurate." },
];

export default function ForBusinessPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-stone-900">
        For businesses &amp; property owners
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Reviewers stay anonymous, but you don&apos;t have to stay silent. Create
        a business account to claim your profile, respond publicly to reviews
        and manage your information. Core features are free.
        {PRICING_ENABLED && (
          <>
            {" "}
            Optional subscriptions add profile tools — see{" "}
            <Link href="/pricing" className="font-medium text-primary-700 hover:underline">
              pricing
            </Link>
            .
          </>
        )}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-xl border border-stone-200 bg-white p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              {s.n}
            </span>
            <h3 className="mt-2 text-sm font-semibold text-stone-900">{s.t}</h3>
            <p className="mt-1 text-xs text-stone-500">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/register?role=business"
          className="rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Create a business account
        </Link>
        <Link
          href="/business/dashboard"
          className="rounded-lg border border-primary-600 px-6 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"
        >
          Go to your dashboard
        </Link>
      </div>
    </div>
  );
}
