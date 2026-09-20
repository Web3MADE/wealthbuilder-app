"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DEV_MODE_KEY, resolveDevUserMode } from "@/presentation/dev/dev-user-mode";
import { DevUserSwitcher } from "@/presentation/dev/DevUserSwitcher";
import { existingUser } from "@/presentation/dev/seeded-users";
import "./wealth-screens.css";

export type WealthIconName = "home" | "portfolio" | "strategy" | "explore" | "activity" | "chat" | "settings" | "bell" | "arrow" | "spark" | "send" | "shield" | "eye" | "clock" | "refresh" | "check";

export function WealthIcon({ name, size = 19 }: { name: WealthIconName; size?: number }) {
  const paths: Record<WealthIconName, ReactNode> = {
    home: <path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z" />,
    portfolio: <><path d="M4 20V5h5l2 3h9v12z"/><path d="m9 16 3-4 3 2 3-4"/></>,
    strategy: <><path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/></>,
    explore: <><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></>,
    activity: <><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></>,
    chat: <><path d="M4 4h16v13H9l-5 4z"/><path d="M9 10h.01M12 10h.01M15 10h.01"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M10 2h4l.7 2.5 2.1.9 2.3-1.3 2.8 2.8-1.3 2.3-2.1.9L14 22h-4l-.7-2.5-2.1-.9-2.3 1.3-2.8-2.8 1.3-2.3-2.1-.9L0 12l2.5-.7.9-2.1-1.3-2.3 2.8-2.8 2.3 1.3 2.1-.9z"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9M10 21h4"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    spark: <path d="m12 2 1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8z"/>,
    send: <path d="M12 21V3m-7 7 7-7 7 7"/>,
    shield: <><path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/><path d="m8 12 3 3 5-6"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a8 8 0 0 1 14-2l1 5M4 12l1 5a8 8 0 0 0 14-2"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/home" className={`wb-brand ${compact ? "compact" : ""}`} aria-label="WealthBuilder home"><span><Image src="/assets/WealthBuilder_logo.png" alt="" width={1774} height={887} priority /></span><strong>WealthBuilder</strong></Link>;
}

export function WealthChat({ mobile = false }: { mobile?: boolean }) {
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (message.trim()) setNotice(true); }
  return <div className={`wb-chat ${mobile ? "mobile" : "desktop"}`}><form onSubmit={submit}><WealthIcon name="spark" size={19}/><label className="sr-only" htmlFor={mobile ? "wealth-chat-mobile" : "wealth-chat-desktop"}>Ask WealthBuilder anything</label><input id={mobile ? "wealth-chat-mobile" : "wealth-chat-desktop"} placeholder="Ask WealthBuilder anything..." value={message} onChange={(event) => { setMessage(event.target.value); setNotice(false); }}/><button type="submit" aria-label="Send message"><WealthIcon name="send" size={17}/></button></form>{notice && <p role="status">AI chat is coming soon.</p>}</div>;
}

const nav = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/portfolio", label: "Portfolio", icon: "portfolio" },
  { href: "/strategy", label: "Strategy", icon: "strategy" },
  { href: "/home#quick-actions", label: "Explore", icon: "explore" },
  { href: "/home#activity", label: "Activity", icon: "activity" },
] as const;

export function WealthShell({ active, children }: { active: "portfolio" | "strategy"; children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || resolveDevUserMode(null, window.localStorage.getItem(DEV_MODE_KEY)) !== "existing") { router.replace("/onboarding"); return; }
    queueMicrotask(() => setReady(true));
  }, [router]);
  if (!ready) return <main className="entry-gate"><p>Opening WealthBuilder…</p></main>;
  return <div className="wb-app"><aside className="wb-sidebar"><Brand/><nav aria-label="Main navigation">{nav.map((item) => <Link key={item.label} href={item.href} className={item.label.toLowerCase() === active ? "active" : ""} aria-current={item.label.toLowerCase() === active ? "page" : undefined}><WealthIcon name={item.icon}/>{item.label}</Link>)}<div className="wb-nav-divider"/><Link href="/chat"><WealthIcon name="chat"/>AI Chat</Link></nav><div className="wb-sidebar-bottom"><Link href="/home#account"><WealthIcon name="settings"/>Settings</Link><div><span>HK</span>{existingUser.name}<span>›</span></div></div></aside><div className="wb-body"><header className="wb-topbar"><div className="wb-mobile-brand"><Brand compact/></div><WealthChat/><button type="button" className="wb-bell" aria-label="Notifications"><WealthIcon name="bell" size={20}/><i/></button></header><main className="wb-content">{children}</main></div><nav className="wb-bottom-nav" aria-label="Mobile navigation"><Link href="/home"><WealthIcon name="home" size={20}/>Home</Link><Link href="/portfolio" className={active === "portfolio" ? "active" : ""} aria-current={active === "portfolio" ? "page" : undefined}><WealthIcon name="portfolio" size={20}/>Portfolio</Link><Link href="/strategy" className={active === "strategy" ? "active" : ""} aria-current={active === "strategy" ? "page" : undefined}><WealthIcon name="strategy" size={20}/>Strategy</Link><Link href="/home#account"><WealthIcon name="settings" size={20}/>More</Link></nav><DevUserSwitcher/></div>;
}
