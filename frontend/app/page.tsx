import Link from "next/link";
import type { Category, Paginated, Review } from "@/lib/api";
import { apiGet } from "@/lib/server-api";
import SearchBar from "@/components/SearchBar";
import ReviewCard from "@/components/ReviewCard";

const LEVELS = [
  {
    icon: "💬",
    name: "Community Review",
    text: "Any anonymous member can share an experience. Every voice counts.",
  },
  {
    icon: "✅",
    name: "Verified Experience",
    text: "Backed by evidence (tenancy agreement, payslip, admission letter) checked by our admins.",
  },
  {
    icon: "🏅",
    name: "Trusted Reviewer",
    text: "Earned by consistent, high-quality reviewers with a strong track record.",
  },
];

export default async function HomePage() {
  const [categories, recent] = await Promise.all([
    apiGet<Category[]>("/categories/"),
    apiGet<Paginated<Review>>("/reviews/?ordering=-created_at"),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-800 to-primary-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-400">
            Akwaaba 👋
          </p>
          <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
            Know before you rent, work, learn or train.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-primary-100">
            Honest, anonymous reviews of apartments, landlords, workplaces,
            schools, hospitals and gyms — written by Ghanaians, for Ghanaians.
          </p>
          <div className="mx-auto mt-8 flex justify-center">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-bold text-stone-900">Browse by category</h2>
        {categories ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="rounded-xl border border-stone-200 bg-white p-4 text-center shadow-sm transition hover:border-primary-500 hover:shadow-md"
              >
                <span className="text-3xl">{c.icon}</span>
                <p className="mt-2 text-sm font-semibold text-stone-800">{c.name}</p>
                <p className="text-xs text-stone-400">{c.listing_count ?? 0} listed</p>
              </Link>
            ))}
          </div>
        ) : (
          <ApiOffline />
        )}
      </section>

      {/* Verification levels */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-xl font-bold text-stone-900">
            Three levels of trust
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Every review is labelled so you know how much weight to give it.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {LEVELS.map((l) => (
              <div key={l.name} className="rounded-xl border border-stone-200 p-5">
                <span className="text-2xl">{l.icon}</span>
                <h3 className="mt-2 font-semibold text-stone-900">{l.name}</h3>
                <p className="mt-1 text-sm text-stone-600">{l.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent reviews */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">Latest reviews</h2>
          <Link href="/search" className="text-sm font-medium text-primary-700 hover:underline">
            Explore all →
          </Link>
        </div>
        {recent && recent.results.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {recent.results.slice(0, 6).map((r) => (
              <ReviewCard key={r.id} review={r} showListing />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-stone-500">No reviews yet — be the first!</p>
        )}
      </section>
    </div>
  );
}

function ApiOffline() {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
      The API is not reachable. Start the backend with{" "}
      <code className="rounded bg-stone-100 px-1">python manage.py runserver</code>{" "}
      and refresh.
    </div>
  );
}
