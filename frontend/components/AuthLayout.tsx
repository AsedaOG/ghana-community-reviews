import Link from "next/link";
import Logo from "./Logo";

const POINTS = [
  { icon: "🎭", text: "Reviews are published under a generated username — never your name or email." },
  { icon: "✅", text: "Evidence-backed reviews get a Verified Experience badge." },
  { icon: "🏪", text: "Businesses claim their profile and reply in public." },
];

/** Split-screen shell for the sign-in and sign-up screens — the first thing
 * anyone sees, since the platform is members-only. */
export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Pitch */}
      <div className="hidden flex-col justify-center bg-gradient-to-b from-primary-800 to-primary-700 px-10 py-16 text-white lg:flex">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-400">
          Akwaaba 🙏🏾
        </p>
        <h2 className="mt-3 max-w-md text-4xl font-extrabold leading-tight">
          Know before you rent, work, learn or train.
        </h2>
        <p className="mt-4 max-w-md text-primary-100">
          Ghana&apos;s community review platform for apartments, landlords,
          workplaces, schools, hospitals and gyms. Members only — so every
          review comes from a real, accountable member of the community.
        </p>
        <ul className="mt-8 space-y-4">
          {POINTS.map((p) => (
            <li key={p.text} className="flex max-w-md gap-3">
              <span className="text-xl">{p.icon}</span>
              <span className="text-sm text-primary-100">{p.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <Logo href="/login" />
          <h1 className="mt-8 text-2xl font-bold text-stone-900">{title}</h1>
          <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            {children}
          </div>
          <p className="mt-6 text-center text-xs text-stone-400">
            <Link href="/about" className="hover:text-primary-700">
              What is this platform?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
