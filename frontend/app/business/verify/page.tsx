"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { setSession } from "@/lib/client-session";
import type { Session } from "@/lib/session";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"busy" | "ok" | "error">("busy");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Missing verification token.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/verify/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setState("error");
          setMessage(data?.detail ?? "Verification failed.");
          return;
        }
        setSession(data as Session);
        setState("ok");
        setMessage("Your email is verified and you are signed in.");
      } catch {
        setState("error");
        setMessage("Could not reach the server. Is the API running?");
      }
    })();
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-4xl">{state === "ok" ? "✅" : state === "error" ? "⚠️" : "⏳"}</p>
      <h1 className="mt-3 text-xl font-bold text-stone-900">Email verification</h1>
      <p className="mt-2 text-sm text-stone-600">{message}</p>
      {state === "ok" && (
        <Link
          href="/business/dashboard"
          className="mt-6 inline-block rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Go to your dashboard
        </Link>
      )}
      {state === "error" && (
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg border border-primary-600 px-5 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
        >
          Back to sign in
        </Link>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm text-stone-500">Loading…</div>}>
      <VerifyInner />
    </Suspense>
  );
}
