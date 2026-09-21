"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DEV_MODE_KEY, resolveDevUserMode } from "@/presentation/dev/dev-user-mode";
import { DevUserSwitcher } from "@/presentation/dev/DevUserSwitcher";
import { existingUser as user } from "@/presentation/dev/seeded-users";
import { formatToken, formatUsd, type FujiPortfolioView, useFujiPortfolio } from "@/presentation/wealth/use-fuji-portfolio";
import { formatPolicyUsd, type ActivePolicyView, useActivePolicy } from "@/presentation/wealth/use-active-policy";
import { activityTime, useDevActivity } from './use-dev-activity';
import type { DevActivity } from '@/infrastructure/dev/dev-activity-store';
import "./home.css";

type IconName = "home" | "portfolio" | "policy" | "explore" | "activity" | "chat" | "settings" | "bell" | "arrow" | "shield" | "spark" | "send" | "eye" | "check";

function Icon({ name, size = 21 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z" /></>,
    portfolio: <><path d="M4 20V5h5l2 3h9v12z" /><path d="m9 16 3-4 3 2 3-4" /></>,
    policy: <><circle cx="12" cy="12" r="9" /><path d="m12 7-3 7 7-3" /></>,
    explore: <><circle cx="10.5" cy="10.5" r="7.5" /><path d="m16 16 5 5" /></>,
    activity: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M7 12h10" /></>,
    chat: <><path d="M4 4h16v13H9l-5 4z" /><path d="M9 10h.01M12 10h.01M15 10h.01" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M10 2h4l.7 2.5 2.1.9 2.3-1.3 2.8 2.8-1.3 2.3.9 2.1L24 12v.1l-2.5.7-.9 2.1 1.3 2.3-2.8 2.8-2.3-1.3-2.1.9L14 22h-4l-.7-2.5-2.1-.9-2.3 1.3-2.8-2.8 1.3-2.3-.9-2.1L0 12l2.5-.7.9-2.1-1.3-2.3 2.8-2.8 2.3 1.3 2.1-.9z" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9M10 21h4" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    shield: <><path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
    spark: <><path d="m12 2 1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8zM19 18l.5 1.5L21 20l-1.5.5L19 22l-.5-1.5L17 20l1.5-.5z" /></>,
    send: <><path d="M12 21V3m-7 7 7-7 7 7" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="2.5" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Brand() {
  return <Link href="/home" className="home-brand" aria-label="WealthBuilder home"><span className="home-brand-mark"><Image src="/assets/WealthBuilder_logo.png" alt="" width={1774} height={887} priority /></span><span>WealthBuilder</span></Link>;
}

const primaryNav: { label: string; icon: IconName; href: string }[] = [
  { label: "Home", icon: "home", href: "/home" },
  { label: "Portfolio", icon: "portfolio", href: "/portfolio" },
  { label: "Strategy", icon: "policy", href: "/strategy" },
  { label: "Explore", icon: "explore", href: "#quick-actions" },
  { label: "Activity", icon: "activity", href: "#activity" },
];

function ChatBar({ id, mobile = false }: { id: string; mobile?: boolean }) {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (message.trim()) setSubmitted(true); }
  return <div className={mobile ? "home-chat-wrap home-chat-mobile" : "home-chat-wrap home-chat-desktop"}><form className="home-chat-bar" onSubmit={submit}><span className="home-chat-spark"><Icon name="spark" size={22} /></span><label className="sr-only" htmlFor={id}>Ask WealthBuilder anything</label><input id={id} value={message} onChange={(event) => { setMessage(event.target.value); setSubmitted(false); }} placeholder="Ask WealthBuilder anything..." /><button type="submit" aria-label="Send message"><Icon name="send" size={21} /></button></form>{submitted && <p className="home-chat-note" role="status">AI chat is coming soon.</p>}</div>;
}

function PortfolioChart() {
  return <div className="home-chart" role="img" aria-label="Illustrative portfolio value chart trending upward"><svg viewBox="0 0 700 170" preserveAspectRatio="none"><defs><linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#79eda1" stopOpacity=".22" /><stop offset="1" stopColor="#79eda1" stopOpacity="0" /></linearGradient></defs><path d="M0 144 C28 141 32 134 54 139 S86 143 111 133 S140 136 162 128 S191 120 213 124 S243 117 266 101 S300 104 326 97 S351 107 379 89 S400 84 426 72 S456 83 478 72 S502 73 524 59 S550 68 570 51 S598 48 618 30 S650 26 670 15 S689 15 700 8 L700 170 L0 170Z" fill="url(#portfolioGradient)" /><path d="M0 144 C28 141 32 134 54 139 S86 143 111 133 S140 136 162 128 S191 120 213 124 S243 117 266 101 S300 104 326 97 S351 107 379 89 S400 84 426 72 S456 83 478 72 S502 73 524 59 S550 68 570 51 S598 48 618 30 S650 26 670 15 S689 15 700 8" fill="none" stroke="#8cf5a8" strokeWidth="1.5" /></svg></div>;
}

function PortfolioCard({ portfolio, error }: { portfolio: FujiPortfolioView | null; error: boolean }) {
  const [period, setPeriod] = useState("1M");
  const [visible, setVisible] = useState(true);
  const total = portfolio ? formatUsd(portfolio.totalUsdMicros) : error ? "Unavailable" : "Loading…";
  return <section className="home-card home-portfolio" id="portfolio" aria-labelledby="portfolio-title"><div className="home-portfolio-top"><div><div className="home-value-label"><h2 id="portfolio-title">Total portfolio value</h2><button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Hide portfolio value" : "Show portfolio value"}><Icon name="eye" size={17} /></button></div><strong className="home-value">{visible ? total : "••••••••"}</strong><p className="home-change">{portfolio ? "Live Fuji balance" : error ? "Could not read Fuji balance" : "Reading Fuji balance…"}</p></div><div className="home-periods" aria-label="Chart period">{["1W", "1M", "1Y", "ALL"].map((item) => <button type="button" key={item} className={period === item ? "active" : ""} aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>)}</div><span className="home-network"><span>▲</span> Avalanche Fuji <span aria-hidden="true">›</span></span></div><PortfolioChart /><div className="home-assets">{portfolio?.positions.map((position) => <div className="home-asset" key={position.id}><span className="home-asset-icon usdc">$</span><span className="home-asset-name"><strong>{position.location === "SUPPLIED" ? "USDC supplied" : "USD Coin"}</strong><small>{position.location === "SUPPLIED" ? "Aave V3" : "USDC"}</small></span><span className="home-asset-amount"><strong>{formatUsd(position.valueUsdMicros)}</strong><small>{formatToken(position.amountAtomic, position.decimals)} USDC</small></span><span className="home-asset-change">{position.location === "SUPPLIED" ? "Supplied" : "Wallet"}</span></div>)}</div><Link className="home-card-link" href="/portfolio">View all assets <Icon name="arrow" size={18} /></Link></section>;
}

function GoalCard() {
  return <section className="home-card home-goal" id="goal"><div className="home-card-heading"><h2>Your goal</h2><a href="/strategy">Edit</a></div><div className="home-goal-main"><span className="home-goal-icon">⌂</span><div><strong>Long-term wealth</strong><p>Grow and build financial freedom</p></div></div><div className="home-goal-progress"><span><i /></span><small>7 / 10 years</small></div><p className="home-on-track"><i />On track</p></section>;
}

function PolicyCard({ policy }: { policy: ActivePolicyView | null }) {
  return <section className="home-card home-policy" id="policy"><div className="home-card-heading"><h2>Your Wealth Policy</h2><span>{policy ? `Active · v${policy.version}` : "Loading…"}</span></div><div className="home-policy-list"><div><Icon name="policy" size={17} /><span>Risk level</span><strong>{policy?.riskLevel ?? "…"}</strong></div><div><Icon name="portfolio" size={17} /><span>Asset concentration</span><strong>{policy ? `Up to ${policy.maxAssetConcentrationPercent}%` : "…"}</strong></div><div><Icon name="shield" size={17} /><span>Liquidity reserve</span><strong>{policy ? `${policy.minimumLiquidReservePercent}% minimum` : "…"}</strong></div><div><Icon name="settings" size={17} /><span>AI autonomy</span><strong>{policy ? (policy.autonomyEnabled ? `Up to ${formatPolicyUsd(policy.autonomyLimitUsd)}` : "Approval required") : "…"}</strong></div></div><a className="home-policy-link" href="/strategy">Review policy <Icon name="arrow" size={18} /></a></section>;
}

function activityIcon(activity: DevActivity): IconName {
  if (activity.kind === 'POLICY_UPDATED') return 'shield';
  if (activity.kind === 'ACTION_BLOCKED' || activity.kind === 'EXECUTION_FAILED') return 'activity';
  if (activity.kind === 'SUPPLY_CONFIRMED') return 'check';
  return 'arrow';
}

function ActivityCard() {
  const { items, error } = useDevActivity();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 3);
  return <section className="home-card home-activity" id="activity"><div className="home-card-heading"><h2>Recent activity</h2>{items.length > 3 && <button type="button" onClick={() => setShowAll((current) => !current)}>{showAll ? 'Show less' : 'View all'}</button>}</div><div>{visible.length === 0 ? <p className="home-activity-empty">{error ? 'Activity is unavailable right now.' : 'Your WealthBuilder activity will appear here.'}</p> : visible.map((activity) => <details className="home-activity-row" key={activity.id}><summary><span className="home-activity-icon"><Icon name={activityIcon(activity)} size={21} /></span><span className="home-activity-text"><strong>{activity.title}</strong><small>{activityTime(activity.occurredAt)} · {activity.description}</small></span><span className={`home-activity-value ${activity.status}`}>{activity.amount ?? activity.status}</span></summary>{activity.details && <div className="home-activity-details"><span>Status: {activity.details.executionStatus ?? activity.status}</span><span>Network: {activity.details.network}</span><span>Account: {activity.details.account}</span>{activity.details.reference && <code>Transaction: {activity.details.reference}</code>}</div>}</details>)}</div></section>;
}

function MobilePolicyCard({ policy }: { policy: ActivePolicyView | null }) {
  return <a className="home-mobile-policy home-card" href="/strategy"><span className="home-mobile-policy-icon"><Icon name="shield" size={24} /></span><span><strong>Your Wealth Policy</strong><small>{policy ? `${policy.riskLevel} risk · ${policy.minimumLiquidReservePercent}% liquid · ${policy.allowedProtocols.join(", ")} approved` : "Loading your active policy…"}</small></span><b>{policy ? `Active · v${policy.version}` : "…"}</b><span className="home-mobile-policy-arrow">›</span></a>;
}

function QuickActions() {
  return <section className="home-quick" id="quick-actions"><h2>Quick actions</h2><div><a href="/chat"><Icon name="chat" size={22} /><span>Chat with<br />WealthBuilder</span><Icon name="arrow" size={17} /></a><a href="/portfolio"><Icon name="portfolio" size={22} /><span>View portfolio</span><Icon name="arrow" size={17} /></a><a href="/strategy"><Icon name="settings" size={22} /><span>Edit policy</span><Icon name="arrow" size={17} /></a></div></section>;
}

export function ExistingUserHome() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const { portfolio, error: portfolioError } = useFujiPortfolio();
  const { policy } = useActivePolicy();
  useEffect(() => {
    if (process.env.NODE_ENV === "production") { router.replace("/onboarding"); return; }
    const mode = resolveDevUserMode(null, window.localStorage.getItem(DEV_MODE_KEY));
    if (mode !== "existing") router.replace("/onboarding");
    else queueMicrotask(() => setReady(true));
  }, [router]);

  if (!ready) return <main className="entry-gate"><p>Opening WealthBuilder…</p></main>;

  return <div className="wealth-home"><aside className="home-sidebar"><Brand /><nav aria-label="Main navigation">{primaryNav.map((item) => <Link key={item.label} href={item.href} className={item.label === "Home" ? "active" : ""} aria-current={item.label === "Home" ? "page" : undefined}><Icon name={item.icon} />{item.label}</Link>)}<div className="home-nav-divider" /><a href="/chat"><Icon name="chat" />AI Chat</a></nav><div className="home-sidebar-bottom"><a href="#account"><Icon name="settings" />Settings</a><div id="account"><span>HK</span><strong>{user.name.split(" ")[0]}</strong><span aria-hidden="true">›</span></div></div></aside>
    <div className="home-page"><header className="home-topbar"><div className="home-mobile-header"><Brand /></div><ChatBar id="ask-desktop" /><button className="home-bell" type="button" aria-label="Notifications"><Icon name="bell" size={23} /><i /></button></header><main className="home-main"><div className="home-columns"><div className="home-primary"><section className="home-hero"><p>Good morning, {user.name.split(" ")[0]}</p><h1>Your wealth<br /><span>is working for you.</span></h1><p>Long-term growth. On-chain. On your terms.</p><div className="home-hero-actions"><a href="/chat">Ask WealthBuilder <Icon name="arrow" size={18} /></a><a href="/strategy">View strategy</a></div><span className="home-goal-float"><Icon name="check" size={20} /><span><strong>Long-term wealth</strong><small>Built different.</small></span></span></section><div className="home-mobile-connected"><i /><span><strong>Connected</strong><small>{portfolio ? `${portfolio.wallet.slice(0, 6)}…${portfolio.wallet.slice(-4)}` : "Fuji account loading…"}</small></span><span aria-hidden="true">›</span></div><PortfolioCard portfolio={portfolio} error={portfolioError} /><MobilePolicyCard policy={policy} /><QuickActions /><div id="ask-mobile"><ChatBar id="ask-input-mobile" mobile /></div></div><div className="home-sidecards"><GoalCard /><PolicyCard policy={policy} /><ActivityCard /></div></div></main></div><nav className="home-bottom-nav" aria-label="Mobile navigation"><a className="active" href="/home" aria-current="page"><Icon name="home" size={25} />Home</a><a href="/portfolio"><Icon name="portfolio" size={25} />Portfolio</a><a href="/strategy"><Icon name="policy" size={25} />Policy</a></nav><DevUserSwitcher /></div>;
}
