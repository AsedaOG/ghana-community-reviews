import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/** The stored session cookie had a token the API no longer accepts (e.g. it
 * was invalidated by logging out elsewhere — tokens are per-account, not
 * per-device). Clear it and send the visitor to log in again; middleware
 * only checks that the cookie exists, not that its token still works, so
 * clearing it here is what stops the redirect from bouncing right back. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
