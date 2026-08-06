export const metadata = { title: "About" };

const BADGES = [
  {
    icon: "🌱",
    name: "First Voice",
    text: "Awarded the moment your first review is published.",
  },
  {
    icon: "🧭",
    name: "Community Guide",
    text: "Awarded after 50 published reviews.",
  },
  {
    icon: "🏅",
    name: "Trusted Voice",
    text: "Awarded after 100 published reviews.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-stone-900">About the platform</h1>

      <section className="mt-6 rounded-2xl bg-primary-800 p-8 text-white">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-400">Our vision</h2>
        <p className="mt-2 text-lg leading-relaxed">
          A trusted, anonymous review platform for Ghana where people can share
          experiences about the places they live, work, study and receive
          services — apartments, landlords, workplaces, schools, hospitals and
          gyms.
        </p>
        <h2 className="mt-6 text-sm font-semibold uppercase tracking-widest text-gold-400">Our mission</h2>
        <p className="mt-2 text-primary-100">
          To help Ghanaians make better decisions through authentic
          community-driven reviews and ratings.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-stone-900">How anonymity works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="font-semibold text-stone-900">🎭 Anonymous in public</h3>
            <p className="mt-1 text-sm text-stone-600">
              Every review is published under a username we generate for you
              (like <em>KenteEagle412</em>). Landlords, employers and schools
              only ever see that name — never your email or your real name.
              Your reputation and badges grow with each review.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="font-semibold text-stone-900">🔐 Members only</h3>
            <p className="mt-1 text-sm text-stone-600">
              Reading and writing reviews requires a free account. Asking for an
              email keeps the platform accountable: it stops throwaway spam,
              lets reputation mean something, and gives moderators a way to
              block people who abuse the platform.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="font-semibold text-stone-900">🏪 Businesses respond openly</h3>
            <p className="mt-1 text-sm text-stone-600">
              Owners claim their profile, get verified by administrators, and
              respond to reviews publicly under the business name — transparency
              on both sides.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="font-semibold text-stone-900">🧾 Evidence, verified</h3>
            <p className="mt-1 text-sm text-stone-600">
              Reviewers can privately attach evidence — a tenancy agreement, a
              payslip, an admission letter. Admins check it and upgrade the
              review to a <strong>Verified Experience</strong>. Evidence is never
              shown publicly.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="font-semibold text-stone-900">🗺️ Built around Ghana</h3>
            <p className="mt-1 text-sm text-stone-600">
              Every listing is organised the Ghanaian way: Region → District →
              Area, from Osu to Ahodwo to Lamashegu.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-stone-900">Reputation &amp; badges</h2>
        <p className="mt-1 text-sm text-stone-500">
          A quick guide to the numbers and icons you&apos;ll see next to a
          reviewer&apos;s username. See how everyone ranks on the{" "}
          <a href="/leaderboard" className="text-primary-700 hover:underline">
            leaderboard
          </a>
          .
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="font-semibold text-stone-900">⭐ Reputation points</h3>
            <p className="mt-1 text-sm text-stone-600">
              Every published review earns you <strong>10 reputation points</strong>.
              It&apos;s a simple running total of how much you&apos;ve
              contributed to the community — the more honest reviews you
              share, the higher it climbs. It&apos;s shown on your reviewer
              profile and used to rank the most active reviewers.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="font-semibold text-stone-900">🏷️ Badges</h3>
            <p className="mt-1 text-sm text-stone-600">
              Badges are awarded automatically as you publish reviews — no
              application needed. They appear next to your username on every
              review you write, so readers can see at a glance how active
              you&apos;ve been.
            </p>
          </div>
          {BADGES.map((b) => (
            <div key={b.name} className="rounded-xl border border-stone-200 bg-white p-5">
              <h3 className="font-semibold text-stone-900">
                {b.icon} {b.name}
              </h3>
              <p className="mt-1 text-sm text-stone-600">{b.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-stone-400">
          Badges are different from a review&apos;s{" "}
          <strong>verification level</strong> (Community, Verified, Trusted) —
          that&apos;s about how credible a single review is, checked by
          admins; reputation and badges are about how active a reviewer has
          been overall.
        </p>
      </section>
    </div>
  );
}
