"use client";

import { API_URL } from "./api";
import { parseSession, SESSION_COOKIE, type Session } from "./session";

const MAX_AGE_DAYS = 30;

export function getSession(): Session | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SESSION_COOKIE}=`));
  return parseSession(match?.slice(SESSION_COOKIE.length + 1));
}

export function setSession(session: Session) {
  const value = encodeURIComponent(JSON.stringify(session));
  document.cookie =
    `${SESSION_COOKIE}=${value}; path=/; max-age=${MAX_AGE_DAYS * 86400}; SameSite=Lax`;
}

export function clearSession() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/** Authenticated JSON fetch from a client component. */
export async function apiFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const session = getSession();
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Token ${session.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const data = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}
