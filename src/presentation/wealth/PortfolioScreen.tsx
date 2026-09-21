"use client";

import { useState } from "react";
import { WealthChat, WealthShell } from "./WealthShell";
import { formatToken, formatUsd, type FujiPortfolioView, useFujiPortfolio } from "./use-fuji-portfolio";

const allocationColors: Record<string, string> = { ETH: "#819cff", BTC: "#ffbe4f", USDC: "#4795fa", AVAX: "#f04a5e" };

function AssetMark({ ticker, symbol }: { ticker: string; symbol: string }) {
  return <span className={`wb-asset-mark ${ticker.toLowerCase()}`} aria-hidden="true">{symbol}</span>;
}

function PortfolioPerformance({ portfolio, error }: { portfolio: FujiPortfolioView | null; error: boolean }) {
  const [range, setRange] = useState("1M");
  const total = portfolio ? formatUsd(portfolio.totalUsdMicros) : error ? "Unavailable" : "Loading…";
  return <section className="wb-performance" aria-label="Portfolio balance"><div className="wb-portfolio-heading"><div><h1>Portfolio</h1><p>Your Fuji USDC and supplied USDC.</p></div><div className="wb-portfolio-filters"><button type="button">Total value⌄</button><div>{["1W", "1M", "1Y", "ALL"].map((item) => <button key={item} type="button" className={range === item ? "active" : ""} aria-pressed={range === item} onClick={() => setRange(item)}>{item}</button>)}</div></div></div><div className="wb-total"><strong>{total}</strong><span>{portfolio ? "Live Fuji balance" : error ? "Could not read Fuji" : "Reading Fuji…"}</span><small>{portfolio ? "Current snapshot" : ""}</small></div><div className="wb-performance-chart" role="img" aria-label="Historical portfolio performance is not available yet"><svg viewBox="0 0 700 170" preserveAspectRatio="none"><defs><linearGradient id="wbPerformanceFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#55e688" stopOpacity=".12"/><stop offset="1" stopColor="#55e688" stopOpacity="0"/></linearGradient></defs><path d="M0 85 H700 V170 H0Z" fill="url(#wbPerformanceFill)"/><path d="M0 85 H700" fill="none" stroke="#64e98c" strokeWidth="1.6"/></svg><div className="wb-chart-y"><span>Live</span><span>snapshot</span></div></div><div className="wb-chart-x"><span>Historical performance will appear here.</span></div></section>;
}

function Assets({ portfolio, mobile = false }: { portfolio: FujiPortfolioView | null; mobile?: boolean }) {
  const total = portfolio ? Number(BigInt(portfolio.totalUsdMicros)) : 0;
  return <section className={`wb-assets wb-panel ${mobile ? "mobile" : "desktop"}`}><h2>Assets</h2><div className="wb-assets-table"><div className="wb-assets-head"><span>Asset</span><span>Balance</span><span>Value</span><span>24h</span><span>Allocation</span></div>{portfolio?.positions.map((position) => <div className="wb-asset-row" key={position.id}><span className="wb-asset-label"><AssetMark ticker="USDC" symbol="$"/><span><strong>{position.location === "SUPPLIED" ? "USDC supplied" : "USD Coin"}</strong><small>{position.location === "SUPPLIED" ? "Aave V3" : "USDC"}</small></span></span><span className="wb-asset-balance">{formatToken(position.amountAtomic, position.decimals)}</span><span className="wb-asset-value">{formatUsd(position.valueUsdMicros)}</span><span className="wb-asset-growth">—</span><span className="wb-asset-share">{total ? `${(Number(BigInt(position.valueUsdMicros)) / total * 100).toFixed(1)}%` : "0.0%"}</span><span className="wb-asset-chevron">›</span></div>)}</div></section>;
}

function Allocation({ portfolio, mobile = false, onAssets }: { portfolio: FujiPortfolioView | null; mobile?: boolean; onAssets?: () => void }) {
  const total = portfolio ? Number(BigInt(portfolio.totalUsdMicros)) : 0;
  return <section className={`wb-allocation wb-panel ${mobile ? "mobile" : "desktop"}`}><h2>Allocation</h2><div className="wb-donut"><div><strong>{portfolio ? formatUsd(portfolio.totalUsdMicros) : "Loading…"}</strong><small>Total value</small></div></div><div className="wb-allocation-list">{portfolio?.positions.map((position) => <div key={position.id}><i style={{ background: allocationColors.USDC }}/><span>{position.location === "SUPPLIED" ? "USDC supplied" : "USDC wallet"}</span><strong>{total ? `${(Number(BigInt(position.valueUsdMicros)) / total * 100).toFixed(1)}%` : "0.0%"}</strong></div>)}</div>{mobile && <button type="button" className="wb-view-assets" onClick={onAssets}>View all assets</button>}</section>;
}

export function PortfolioScreen() {
  const [mobileView, setMobileView] = useState<"assets" | "allocation">("assets");
  const { portfolio, error } = useFujiPortfolio();
  return <WealthShell active="portfolio"><div className={`wb-portfolio-screen ${mobileView === "allocation" ? "allocation-view" : ""}`}><PortfolioPerformance portfolio={portfolio} error={error}/><div className="wb-mobile-allocation-title"><h1>Portfolio</h1></div><div className="wb-mobile-view-tabs" aria-label="Portfolio view"><button type="button" className={mobileView === "assets" ? "active" : ""} aria-pressed={mobileView === "assets"} onClick={() => setMobileView("assets")}>Assets</button><button type="button" className={mobileView === "allocation" ? "active" : ""} aria-pressed={mobileView === "allocation"} onClick={() => setMobileView("allocation")}>Allocation</button></div><div className="wb-portfolio-grid"><Assets portfolio={portfolio}/><Allocation portfolio={portfolio}/></div><div className="wb-mobile-portfolio-state">{mobileView === "assets" ? <Assets portfolio={portfolio} mobile/> : <Allocation portfolio={portfolio} mobile onAssets={() => setMobileView("assets")}/>}</div><div className="wb-screen-chat"><WealthChat mobile/></div></div></WealthShell>;
}
