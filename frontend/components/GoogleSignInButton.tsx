"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, GOOGLE_CLIENT_ID } from "@/lib/api";
import { setSession } from "@/lib/client-session";
import { homePathFor, type Session } from "@/lib/session";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; width?: number; text?: string }
          ) => void;
        };
      };
    };
  }
}

/** "Continue with Google" — renders nothing if NEXT_PUBLIC_GOOGLE_CLIENT_ID
 * isn't set, so the feature stays invisible until it's configured. */
export default function GoogleSignInButton({
  role = "reviewer",
  next,
}: {
  role?: "reviewer" | "business";
  next?: string | null;
}) {
  const router = useRouter();
  const divRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      setError(null);
      try {
        const res = await fetch(`${API_URL}/auth/google/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential, role }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.detail ?? "Google sign-in failed.");
          return;
        }
        const session = data as Session;
        setSession(session);
        router.replace(next || homePathFor(session));
        router.refresh();
      } catch {
        setError("Could not reach the server. Is the API running?");
      }
    },
    [role, next, router]
  );

  useEffect(() => {
    if (!scriptReady || !divRef.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredential,
    });
    window.google.accounts.id.renderButton(divRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "continue_with",
    });
  }, [scriptReady, handleCredential]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={divRef} className="flex justify-center" />
      {error && <p className="mt-2 text-center text-xs text-red-700">{error}</p>}
    </div>
  );
}
