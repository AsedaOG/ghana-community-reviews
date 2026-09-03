import { cookies } from "next/headers";
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
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...(revalidateSeconds != null
        ? { next: { revalidate: revalidateSeconds } }
        : { cache: "no-store" as const }),
      headers: session ? { Authorization: `Token ${session.token}` } : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
