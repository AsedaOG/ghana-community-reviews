"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { API_URL } from "@/lib/api";
import { setSession } from "@/lib/client-session";
import { homePathFor, type Session } from "@/lib/session";
import AuthLayout from "@/components/AuthLayout";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/auth/password/reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.detail ?? "Could not reset your password.");
        return;
      }
      const session = data as Session;
      setSession(session);
      router.replace(homePathFor(session));
      router.refresh();
    } catch {
      setError("Could not reach the server. Is the API running?");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

  if (!token) {
    return (
      <AuthLayout title="Reset your password" subtitle="This link is missing its token.">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          This reset link is invalid. Request a new one below.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 block w-full rounded-lg bg-primary-600 py-2.5 text-center font-semibold text-white hover:bg-primary-700"
        >
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="At least 8 characters.">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold text-stone-700">
          New password
          <input
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        <label className="block text-sm font-semibold text-stone-700">
          Confirm password
          <input
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={input}
          />
        </label>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary-600 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
