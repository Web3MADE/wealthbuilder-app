"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEV_MODE_KEY, ONBOARDING_KEY, resolveDevUserMode, routeForDevUser, saveDevUserMode } from "@/presentation/dev/dev-user-mode";
import "@/presentation/home/home.css";

export function EntryGate() {
  const router = useRouter();
  useEffect(() => {
    if (process.env.NODE_ENV === "production") { router.replace("/onboarding"); return; }
    const query = new URLSearchParams(window.location.search).get("devUser");
    const saved = window.localStorage.getItem(DEV_MODE_KEY);
    const mode = resolveDevUserMode(query, saved);
    if (query === "new" || query === "existing") saveDevUserMode(window.localStorage, mode);
    if (mode === "existing") window.localStorage.removeItem(ONBOARDING_KEY);
    router.replace(routeForDevUser(mode));
  }, [router]);
  return <main className="entry-gate" aria-live="polite"><span className="entry-gate-mark">W</span><p>Opening WealthBuilder…</p></main>;
}
