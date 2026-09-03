import Link from "next/link";
import { getServerSession } from "@/lib/server-api";
import { PRICING_ENABLED } from "@/lib/features";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import UserMenu from "./UserMenu";

export default async function Header() {
  const session = await getServerSession();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href={session ? "/" : "/login"} className="flex shrink-0 items-center" aria-label="Ghana Community Reviews home">
          <span className="sm:hidden">
            <Logo iconOnly />
          </span>
          <span className="hidden sm:block">
            <Logo />
          </span>
        </Link>

        {session ? (
          <>
            <div className="flex-1">
              <SearchBar compact />
            </div>
            <nav className="hidden items-center gap-5 text-sm font-medium text-stone-600 md:flex">
              <Link href="/leaderboard" className="hover:text-primary-700">
                Leaderboard
              </Link>
              <Link href="/about" className="hover:text-primary-700">
                About
              </Link>
              {PRICING_ENABLED && (
                <Link href="/pricing" className="hover:text-primary-700">
                  Pricing
                </Link>
              )}
            </nav>
            <UserMenu session={session} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-end gap-3 text-sm font-medium">
            <Link href="/login" className="text-stone-600 hover:text-primary-700">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-white hover:bg-primary-700"
            >
              Join
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
