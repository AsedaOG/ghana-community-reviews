import { apiGet } from "@/lib/server-api";

export const metadata = { title: "Leaderboard" };

interface LeaderboardEntry {
  username: string;
  reputation: number;
  is_trusted: boolean;
  review_count: number;
  badges: { name: string; slug: string; description: string; icon: string }[];
  created_at: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const reviewers = await apiGet<LeaderboardEntry[]>("/reviewers/leaderboard/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-stone-900">Top reviewers</h1>
      <p className="mt-1 text-sm text-stone-500">
        Ranked by reputation — 10 points per published review. See what the
        numbers and badges mean on the{" "}
        <a href="/about" className="text-primary-700 hover:underline">
          About page
        </a>
        .
      </p>

      {!reviewers ? (
        <p className="mt-8 text-sm text-stone-500">The API is not reachable.</p>
      ) : reviewers.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
          No reviewers on the board yet — be the first to publish a review.
        </p>
      ) : (
        <ol className="mt-6 space-y-2">
          {reviewers.map((r, i) => (
            <li
              key={r.username}
              className={`flex items-center gap-4 rounded-xl border p-4 ${
                i < 3 ? "border-gold-400 bg-gold-100/40" : "border-stone-200 bg-white"
              }`}
            >
              <span className="w-8 shrink-0 text-center text-lg font-bold text-stone-400">
                {MEDALS[i] ?? `#${i + 1}`}
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                {r.username[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1 font-semibold text-stone-800">
                  {r.username}
                  {r.is_trusted && (
                    <span title="Trusted Reviewer" className="text-gold-600">
                      ✓
                    </span>
                  )}
                  {r.badges.map((b) => (
                    <span key={b.slug} title={b.name}>
                      {b.icon}
                    </span>
                  ))}
                </p>
                <p className="text-xs text-stone-400">
                  {r.review_count} review{r.review_count === 1 ? "" : "s"}
                </p>
              </div>
              <p className="shrink-0 text-right">
                <span className="text-lg font-bold text-primary-700">{r.reputation}</span>
                <span className="block text-xs text-stone-400">points</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
