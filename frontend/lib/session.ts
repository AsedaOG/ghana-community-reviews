/** The session lives in a cookie rather than localStorage so that three
 * different layers can see it: middleware (route gating), server components
 * (data fetching with the API token) and client components. */

export const SESSION_COOKIE = "gcr_session";

export type SessionKind = "reviewer" | "owner" | "staff";

export interface Session {
  token: string;
  kind: SessionKind;
  /** Display name: the anonymous username, business name, or email. */
  name: string;
  email: string;
  is_staff: boolean;
  /** The public anonymous username, when this account has one. */
  username: string;
}

export function parseSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  try {
    const session = JSON.parse(decodeURIComponent(raw)) as Session;
    return session?.token ? session : null;
  } catch {
    return null;
  }
}

/** Where each role lands after signing in. */
export function homePathFor(session: Session): string {
  if (session.kind === "staff") return "/admin-panel";
  if (session.kind === "owner") return "/business/dashboard";
  return "/";
}
