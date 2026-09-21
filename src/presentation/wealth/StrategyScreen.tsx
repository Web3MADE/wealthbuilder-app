"use client";

import { useState } from "react";
import Link from "next/link";
import { WealthChat, WealthIcon, WealthShell } from "./WealthShell";
import { formatPolicyUsd, type ActivePolicyView, useActivePolicy } from './use-active-policy';

type StrategyTab = "overview" | "recommendations" | "opportunities" | "risk" | "scenarios";
const recommendations = [
  { title: "Increase ETH allocation", detail: "Aligns with your long-term goal", icon: "♦", color: "eth" },
  { title: "Earn yield on stablecoins", detail: "Potential 4–6% APY on Avalanche", icon: "♧", color: "stable" },
  { title: "Consider rebalancing", detail: "Portfolio drift detected", icon: "⟳", color: "rebalance" },
  { title: "Explore AVAX opportunities", detail: "Ecosystem growth and incentives", icon: "▲", color: "avax" },
];

function OnTrack() {
  return <section className="wb-on-track wb-panel"><div><small>Strategy overview</small><h2>Your portfolio is on track</h2><p>Aligned with your long-term wealth goal. Keep going.</p><i/></div></section>;
}

function Goal() {
  return <section className="wb-strategy-goal wb-panel"><span className="wb-goal-icon">⌂</span><div><strong>Long-term wealth</strong><p>Grow and build financial freedom</p></div><span className="wb-mobile-chevron">›</span><button type="button">View goal</button></section>;
}

function PolicyMetrics({ policy }: { policy: ActivePolicyView | null }) {
  return <div className="wb-policy-metrics"><section className="wb-panel"><small>Risk level</small><strong>{policy?.riskLevel ?? 'Loading…'}</strong><i/></section><section className="wb-panel"><small>Max asset concentration</small><strong>{policy ? `${policy.maxAssetConcentrationPercent}%` : 'Loading…'}</strong><i/></section><section className="wb-panel"><small>Minimum liquid reserve</small><strong>{policy ? `${policy.minimumLiquidReservePercent}%` : 'Loading…'}</strong><i/></section><section className="wb-panel"><small>AI autonomy</small><strong>{policy ? (policy.autonomyEnabled ? `Up to ${formatPolicyUsd(policy.autonomyLimitUsd)}` : 'Approval required') : 'Loading…'}</strong><i/></section></div>;
}

function MobilePolicySummary({ policy }: { policy: ActivePolicyView | null }) {
  return <div className="wb-mobile-policy-summary wb-panel"><div><WealthIcon name="strategy" size={16}/><span>Risk level</span><strong>{policy?.riskLevel ?? '…'}</strong></div><div><WealthIcon name="portfolio" size={16}/><span>Asset concentration</span><strong>{policy ? `${policy.maxAssetConcentrationPercent}% maximum` : '…'}</strong></div><div><WealthIcon name="shield" size={16}/><span>Liquid reserve</span><strong>{policy ? `${policy.minimumLiquidReservePercent}% minimum` : '…'}</strong></div><div><WealthIcon name="settings" size={16}/><span>AI autonomy</span><strong>{policy ? (policy.autonomyEnabled ? `Up to ${formatPolicyUsd(policy.autonomyLimitUsd)}` : 'Approval required') : '…'}</strong></div></div>;
}

function PolicyDetails({ policy }: { policy: ActivePolicyView | null }) {
  return <section className="wb-policy-details wb-panel"><small>Active Wealth Policy {policy ? `· v${policy.version}` : ''}</small><div><span>Transaction limit<strong>{policy ? formatPolicyUsd(policy.transactionLimitUsd) : 'Loading…'}</strong></span><span>Approved protocols<strong>{policy?.allowedProtocols.join(', ') ?? 'Loading…'}</strong></span></div></section>;
}

function Projection() {
  const [scenario, setScenario] = useState("Moderate");
  return <section className="wb-projection wb-panel"><div className="wb-projection-top"><div><small>Projected portfolio value <WealthIcon name="eye" size={12}/></small><strong>$52,342</strong><span>Estimated in 5 years</span></div><div className="wb-scenarios" aria-label="Projection scenario">{["Conservative", "Moderate", "Aggressive"].map((option) => <button type="button" key={option} className={scenario === option ? "active" : ""} aria-pressed={scenario === option} onClick={() => setScenario(option)}>{option}</button>)}</div></div><div className="wb-projection-chart" role="img" aria-label="Illustrative five-year projection rising to 52,342 dollars"><svg viewBox="0 0 600 160" preserveAspectRatio="none"><defs><linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#4de880" stopOpacity=".23"/><stop offset="1" stopColor="#4de880" stopOpacity="0"/></linearGradient></defs><path d="M0 145 C80 135 130 126 202 109 S336 75 418 55 S530 37 600 30 L600 160 L0 160Z" fill="url(#projectionFill)"/><path d="M0 145 C80 135 130 126 202 109 S336 75 418 55 S530 37 600 30" fill="none" stroke="#5be981" strokeWidth="2"/><circle cx="0" cy="145" r="5" fill="#6cf391"/><circle cx="310" cy="84" r="4" fill="#6cf391"/><circle cx="600" cy="30" r="5" fill="#6cf391"/></svg></div><div className="wb-projection-labels"><span>$12.4K<small>Now</small></span><span>$52.3K<small>5 years</small></span></div><div className="wb-projection-mobile-scenarios wb-scenarios" aria-label="Projection scenario">{["Conservative", "Moderate", "Aggressive"].map((option) => <button type="button" key={option} className={scenario === option ? "active" : ""} aria-pressed={scenario === option} onClick={() => setScenario(option)}>{option}</button>)}</div></section>;
}

function Recommendations({ full = false }: { full?: boolean }) {
  return <section className={`wb-recommendations wb-panel ${full ? "full" : ""}`}><div className="wb-recommendations-heading"><h2>{full ? "Recommendations" : "Key actions"}</h2>{!full && <p>Based on your policy and market conditions.</p>}</div><div>{recommendations.slice(0, full ? 4 : 3).map((item) => <button type="button" className="wb-rec-row" key={item.title}><span className={`wb-rec-icon ${item.color}`}>{item.icon}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span><span className="wb-rec-arrow">›</span></button>)}</div>{full && <button type="button" className="wb-view-recs">View all recommendations</button>}</section>;
}

export function StrategyScreen() {
  const [tab, setTab] = useState<StrategyTab>("overview");
  const { policy } = useActivePolicy();
  const tabs: StrategyTab[] = ["overview", "recommendations", "opportunities", "risk", "scenarios"];
  return <WealthShell active="strategy"><div className="wb-strategy-screen"><header className="wb-strategy-heading"><div><h1>Your strategy</h1><p>A personalised plan for long-term wealth.</p></div><Link href="/chat">Change in chat</Link></header><nav className="wb-strategy-tabs" aria-label="Strategy view">{tabs.map((item) => <button type="button" key={item} className={tab === item ? "active" : ""} aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)}>{(item[0] ?? "").toUpperCase() + item.slice(1)}</button>)}</nav><div className={`wb-strategy-overview ${tab === "overview" ? "visible" : ""}`}><div className="wb-overview-top"><OnTrack/><Goal/></div><PolicyMetrics policy={policy}/><MobilePolicySummary policy={policy}/><PolicyDetails policy={policy}/><div className="wb-overview-bottom"><Projection/><Recommendations/></div></div>{tab === "recommendations" && <div className="wb-strategy-tab-panel"><Recommendations full/></div>}{tab !== "overview" && tab !== "recommendations" && <div className="wb-strategy-tab-panel"><Projection/><Recommendations/></div>}<div className="wb-screen-chat"><WealthChat mobile/></div></div></WealthShell>;
}
