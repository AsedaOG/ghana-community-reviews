import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-stone-500">
            Know before you rent, work, learn or train — honest, anonymous
            reviews written by Ghanaians, for Ghanaians.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-700">Explore</p>
          <ul className="mt-2 space-y-1 text-sm text-stone-500">
            <li><Link href="/category/apartments" className="hover:text-primary-700">Apartments</Link></li>
            <li><Link href="/category/landlords" className="hover:text-primary-700">Landlords</Link></li>
            <li><Link href="/category/workplaces" className="hover:text-primary-700">Workplaces</Link></li>
            <li><Link href="/category/schools" className="hover:text-primary-700">Schools</Link></li>
            <li><Link href="/category/hospitals" className="hover:text-primary-700">Hospitals</Link></li>
            <li><Link href="/category/gyms" className="hover:text-primary-700">Gyms</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-700">Platform</p>
          <ul className="mt-2 space-y-1 text-sm text-stone-500">
            <li><Link href="/about" className="hover:text-primary-700">About &amp; mission</Link></li>
            <li><Link href="/for-business" className="hover:text-primary-700">Claim your business</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-100 py-4 text-center text-xs text-stone-400">
        Built for Ghana 🇬🇭 — reviewers stay anonymous, businesses get a voice.
      </div>
    </footer>
  );
}
