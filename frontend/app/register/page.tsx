"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { API_URL } from "@/lib/api";
import { setSession } from "@/lib/client-session";
import { homePathFor, type Session } from "@/lib/session";
import AuthLayout from "@/components/AuthLayout";
import GoogleSignInButton from "@/components/GoogleSignInButton";

type Role = "reviewer" | "business";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [role, setRole] = useState<Role>(
    params.get("role") === "business" ? "business" : "reviewer"
  );

  const [form, setForm] = useState({
    email: "",
    password: "",
    business_name: "",
    phone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const endpoint =
        role === "business" ? "/auth/register/" : "/reviewer/register/";
      const body =
        role === "business"
          ? {
              email: form.email,
              password: form.password,
              business_name: form.business_name,
              phone: form.phone,
            }
          : { email: form.email, password: form.password };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.detail ?? "Registration failed.");
        return;
      }
      // Businesses must verify their email before they can sign in; reviewers
      // are signed in immediately.
      if (role === "business") {
        setCheckEmail(true);
        return;
      }
      const session = data as Session;
      setSession(session);
      router.replace(next || homePathFor(session));
      router.refresh();
    } catch {
      setError("Could not reach the server. Is the API running?");
    } finally {
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="One more step before you can sign in."
      >
        <p className="text-4xl">📬</p>
        <p className="mt-3 text-sm text-stone-600">
          We sent a verification link to <strong>{form.email}</strong>. Click it
          to activate your business account.
        </p>
        <p className="mt-3 text-xs text-stone-400">
          In local development, the email is printed in the Django terminal.
        </p>
      </AuthLayout>
    );
  }

  const input =
    "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

  return (
    <AuthLayout
      title="Create your account"
      subtitle="You need an account to browse and review — it keeps the community accountable."
    >
      {/* Role toggle */}
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-stone-100 p-1">
        {(["reviewer", "business"] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-md py-1.5 text-sm font-semibold transition ${
              role === r ? "bg-white text-primary-700 shadow-sm" : "text-stone-500"
            }`}
          >
            {r === "reviewer" ? "I'm a reviewer" : "I'm a business"}
          </button>
        ))}
      </div>

      <p className="mb-4 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
        {role === "reviewer"
          ? "You'll get a generated username like KenteEagle412. That's the only thing other people see — your email is never shown publicly."
          : "Claim your listings, respond to reviews publicly and manage your profile. We'll email you a verification link."}
      </p>

      <form onSubmit={submit} className="space-y-4">
        {role === "business" && (
          <>
            <label className="block text-sm font-semibold text-stone-700">
              Business name
              <input
                required
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                className={input}
              />
            </label>
            <label className="block text-sm font-semibold text-stone-700">
              Phone <span className="font-normal text-stone-400">(optional)</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={input}
              />
            </label>
          </>
        )}
        <label className="block text-sm font-semibold text-stone-700">
          Email{" "}
          {role === "reviewer" && (
            <span className="font-normal text-stone-400">(kept private)</span>
          )}
          <input
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={input}
          />
        </label>
        <label className="block text-sm font-semibold text-stone-700">
          Password
          <input
            required
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={input}
          />
          <span className="text-xs font-normal text-stone-400">
            At least 8 characters
          </span>
        </label>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary-600 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {busy
            ? "Creating…"
            : role === "reviewer"
              ? "Create my anonymous identity"
              : "Create business account"}
        </button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-stone-400">
        <span className="h-px flex-1 bg-stone-200" />
        or
        <span className="h-px flex-1 bg-stone-200" />
      </div>
      <GoogleSignInButton role={role} next={next} />
      <p className="mt-5 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-semibold text-primary-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
