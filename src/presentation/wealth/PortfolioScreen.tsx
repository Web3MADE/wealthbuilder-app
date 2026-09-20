"use client";

import { useState } from "react";
import { existingUser as user } from "@/presentation/dev/seeded-users";
import { WealthChat, WealthShell } from "./WealthShell";

const allocationColors: Record<string, string> = { ETH: "#819cff", BTC: "#ffbe4f", USDC: "#4795fa", AVAX: "#f04a5e" };

function AssetMark({ ticker, symbol }: { ticker: string; symbol: string }) {
  return <span className={`wb-asset-mark ${ticker.toLowerCase()}`} aria-hidden="true">{symbol}</span>;
}

function PortfolioPerformance() {
  const [range, setRange] = useState("1M");
  return <section className="wb-performance" aria-label="Portfolio performance"><div className="wb-portfolio-heading"><div><h1>Portfolio</h1><p>Your assets. All in one place.</p></div><div className="wb-portfolio-filters"><button type="button">Total value⌄</button><div>{["1W", "1M", "1Y", "ALL"].map((item) => <button key={item} type="button" className={range === item ? "active" : ""} aria-pressed={range === item} onClick={() => setRange(item)}>{item}</button>)}</div></div></div><div className="wb-total"><strong>{user.portfolioValue}</strong><span>↗ &nbsp;{user.portfolioChange}</span><small>(30 days)</small></div><div className="wb-performance-chart" role="img" aria-label="Illustrative portfolio value rising over the last month"><svg viewBox="0 0 700 170" preserveAspectRatio="none"><defs><linearGradient id="wbPerformanceFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#55e688" stopOpacity=".3"/><stop offset="1" stopColor="#55e688" stopOpacity="0"/></linearGradient></defs><path d="M0 150 C26 148 29 139 55 141 S80 143 100 138 S130 128 153 135 S182 123 207 127 S235 113 260 117 S290 106 313 101 S345 111 369 99 S390 105 413 90 S438 83 457 70 S486 66 511 68 S538 80 563 70 S590 76 612 61 S639 53 663 38 S685 37 700 31 L700 170 L0 170Z" fill="url(#wbPerformanceFill)"/><path d="M0 150 C26 148 29 139 55 141 S80 143 100 138 S130 128 153 135 S182 123 207 127 S235 113 260 117 S290 106 313 101 S345 111 369 99 S390 105 413 90 S438 83 457 70 S486 66 511 68 S538 80 563 70 S590 76 612 61 S639 53 663 38 S685 37 700 31" fill="none" stroke="#64e98c" strokeWidth="1.6"/></svg><div className="wb-chart-y"><span>$14K</span><span>$12K</span><span>$10K</span><span>$8K</span></div></div><div className="wb-chart-x"><span>Aug 18</span><span>Aug 25</span><span>Sep 1</span><span>Sep 8</span><span>Sep 15</span></div></section>;
}

function Assets({ mobile = false }: { mobile?: boolean }) {
  return <section className={`wb-assets wb-panel ${mobile ? "mobile" : "desktop"}`}><h2>Assets</h2><div className="wb-assets-table"><div className="wb-assets-head"><span>Asset</span><span>Balance</span><span>Value</span><span>24h</span><span>Allocation</span></div>{user.positions.map((position) => <div className="wb-asset-row" key={position.ticker}><span className="wb-asset-label"><AssetMark ticker={position.ticker} symbol={position.symbol}/><span><strong>{position.asset}</strong><small>{position.ticker}</small></span></span><span className="wb-asset-balance">{position.quantity.split(" ")[0]}</span><span className="wb-asset-value">{position.value}</span><span className="wb-asset-growth">↑ {position.change}</span><span className="wb-asset-share">{Number.parseFloat(position.share).toFixed(1)}%</span><span className="wb-asset-chevron">›</span></div>)}</div></section>;
}

function Allocation({ mobile = false, onAssets }: { mobile?: boolean; onAssets?: () => void }) {
  return <section className={`wb-allocation wb-panel ${mobile ? "mobile" : "desktop"}`}><h2>Allocation</h2><div className="wb-donut"><div><strong>{user.portfolioValue}</strong><small>Total value</small></div></div><div className="wb-allocation-list">{user.positions.map((position) => <div key={position.ticker}><i style={{ background: allocationColors[position.ticker] }}/><span>{position.asset}</span><strong>{Number.parseFloat(position.share).toFixed(1)}%</strong></div>)}</div>{mobile && <button type="button" className="wb-view-assets" onClick={onAssets}>View all assets</button>}</section>;
}

export function PortfolioScreen() {
  const [mobileView, setMobileView] = useState<"assets" | "allocation">("assets");
  return <WealthShell active="portfolio"><div className={`wb-portfolio-screen ${mobileView === "allocation" ? "allocation-view" : ""}`}><PortfolioPerformance/><div className="wb-mobile-allocation-title"><h1>Portfolio</h1></div><div className="wb-mobile-view-tabs" aria-label="Portfolio view"><button type="button" className={mobileView === "assets" ? "active" : ""} aria-pressed={mobileView === "assets"} onClick={() => setMobileView("assets")}>Assets</button><button type="button" className={mobileView === "allocation" ? "active" : ""} aria-pressed={mobileView === "allocation"} onClick={() => setMobileView("allocation")}>Allocation</button></div><div className="wb-portfolio-grid"><Assets/><Allocation/></div><div className="wb-mobile-portfolio-state">{mobileView === "assets" ? <Assets mobile/> : <Allocation mobile onAssets={() => setMobileView("assets")}/>}</div><div className="wb-screen-chat"><WealthChat mobile/></div></div></WealthShell>;
}
