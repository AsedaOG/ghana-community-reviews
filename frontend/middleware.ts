import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/** Reachable without signing in. Everything else redirects to /login. */
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/business/verify",
  "/about",
  "/forgot-password",
  "/reset-password",
];

/** Public browsing, Glassdoor-style: anyone can see what's here — the
 * landing page, categories, search, and a listing's reviews — without an
 * account. Writing a review, voting, replying, reporting, and every
 * account-specific page still need one; that's enforced by the API and by
 * each page's own UI, not by this list. Matched separately from
 * PUBLIC_PATHS (rather than folded into it as another prefix) so that
 * /listing/<slug> is public but /listing/<slug>/review is not — a plain
 * "/listing" prefix would let both through. */
function isPublicBrowsePath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/search") return true;
  if (pathname === "/category" || pathname.startsWith("/category/")) return true;
  return /^\/listing\/[^/]+\/?$/.test(pathname);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    isPublicBrowsePath(pathname);
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Send people back where they were headed once they sign in.
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Signed-in users have no reason to see the auth screens.
  if (hasSession && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon).*)"],
};
