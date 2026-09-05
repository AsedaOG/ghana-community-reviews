import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "./api";
import { parseSession, SESSION_COOKIE, type Session } from "./session";

export async function getServerSession(): Promise<Session | null> {
  const store = await cookies();
  return parseSession(store.get(SESSION_COOKIE)?.value);
}

/** Server-side GET with the session token attached. Returns null instead of
 * throwing so pages can render a friendly empty state.
 *
 * `revalidateSeconds` opts a call into Next's shared data cache instead of
 * always hitting the API fresh — only safe for responses that are the same
 * for every viewer (e.g. categories). Leave it unset (the default) for
 * anything personalized, since the cache isn't keyed by the Authorization
 * header and a cached response would leak across users. */
export async function apiGet<T>(
  path: string,
  revalidateSeconds?: number
): Promise<T | null> {
  const session = await getServerSession();
  let sessionExpired = false;
  let result: T | null = null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...(revalidateSeconds != null
        ? { next: { revalidate: revalidateSeconds } }
        : { cache: "no-store" as const }),
      headers: session ? { Authorization: `Token ${session.token}` } : undefined,
    });
    // A cookie was sent but the API rejected it — the token was invalidated
    // (e.g. by logging out elsewhere), not a real 404. Middleware only
    // checks that the cookie exists, so this is the one place that catches
    // a stale token. Left outside the surrounding try/catch further down:
    // redirect() throws by design and a catch block would swallow it.
    if (res.status === 401 && session) {
      sessionExpired = true;
    } else if (res.ok) {
      result = (await res.json()) as T;
    }
  } catch {
    // network/parse error — fall through and return null below
  }
  if (sessionExpired) redirect("/session-expired");
  return result;
}
