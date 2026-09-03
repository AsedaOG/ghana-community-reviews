"use client";

import Link from "next/link";
import { useState } from "react";
import { API_URL } from "@/lib/api";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/auth/password/forgot/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // A 200 always means "if that email has an account, a link was sent"
      // — that's deliberate, don't read anything into it either way. A
      // non-ok status means the server itself hit a problem (e.g. the
      // email provider rejected the send), which is different from not
      // being reachable at all.
      if (res.ok) setSent(true);
      else setError("Something went wrong sending the reset email. Try again shortly.");
    } catch {
      setError("Could not reach the server. Is the API running?");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a link to choose a new one."
    >
      {sent ? (
        <div className="text-center">
          <p className="text-3xl">📬</p>
          <p className="mt-3 text-sm text-stone-600">
            If <span className="font-semibold">{email}</span> has an account, a
            reset link is on its way. The link works for 2 hours.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg border border-primary-600 px-5 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold text-stone-700">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm text-stone-500">
            <Link href="/login" className="font-semibold text-primary-700 hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
