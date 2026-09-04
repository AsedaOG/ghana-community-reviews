"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch, clearSession } from "@/lib/client-session";
import type { Session } from "@/lib/session";

const ROLE_LABEL: Record<Session["kind"], string> = {
  reviewer: "Reviewer",
  owner: "Business owner",
  staff: "Moderator",
};

export default function UserMenu({ session }: { session: Session }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function signOut() {
    clearSession();
    router.replace("/login");
    router.refresh();
    apiFetch("/auth/logout/", { method: "POST" }).catch(() => {});
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-stone-100 py-1 pl-1 pr-3 text-sm font-semibold text-stone-700 hover:bg-stone-200"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
          {session.name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:block">{session.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-stone-800">
              {session.name}
            </p>
            <p className="text-xs text-stone-400">{ROLE_LABEL[session.kind]}</p>
          </div>
          <div className="py-1 text-sm">
            <Link
              href="/reviewer/profile"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-stone-700 hover:bg-stone-50"
            >
              🎭 My reviewer profile
            </Link>
            <Link
              href="/listings/request"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-stone-700 hover:bg-stone-50"
            >
              📝 Suggest a listing
            </Link>
            {session.kind === "owner" && (
              <Link
                href="/business/dashboard"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-stone-700 hover:bg-stone-50"
              >
                💼 Business dashboard
              </Link>
            )}
            {session.is_staff && (
              <Link
                href="/admin-panel"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-stone-700 hover:bg-stone-50"
              >
                🛡️ Moderation panel
              </Link>
            )}
            <button
              onClick={signOut}
              className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
