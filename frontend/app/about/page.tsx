export const metadata = { title: "About" };

const PHASES = [
  {
    phase: "Phase 1 — Now",
    title: "Free for everyone",
    text: "A free platform focused on growth: building trust, coverage and an honest review culture across Ghana.",
    active: true,
  },
  {
    phase: "Phase 2",
    title: "Business subscriptions",
    text: "Paid tools for businesses: richer profiles, analytics and profile management.",
    active: false,
  },
  {
    phase: "Phase 3",
    title: "Market intelligence",
    text: "Premium reports on rental markets, employer reputation and service quality trends.",
    active: false,
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
        <h2 className="text-lg font-bold text-stone-900">Roadmap</h2>
        <div className="mt-4 space-y-3">
          {PHASES.map((p) => (
            <div
              key={p.phase}
              className={`rounded-xl border p-5 ${
                p.active
                  ? "border-primary-500 bg-primary-50"
                  : "border-stone-200 bg-white"
              }`}
            >
              <p className={`text-xs font-bold uppercase tracking-wide ${p.active ? "text-primary-700" : "text-stone-400"}`}>
                {p.phase}
              </p>
              <h3 className="mt-1 font-semibold text-stone-900">{p.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
