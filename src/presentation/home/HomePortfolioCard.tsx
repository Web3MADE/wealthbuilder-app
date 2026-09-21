'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye } from 'lucide-react';
import {
  formatToken,
  formatUsd,
  type FujiPortfolioView,
} from '@/presentation/wealth/use-fuji-portfolio';
import { HomePortfolioChart } from './HomePortfolioChart';

export function HomePortfolioCard({
  portfolio,
  error,
}: {
  portfolio: FujiPortfolioView | null;
  error: boolean;
}) {
  const [period, setPeriod] = useState('1M');
  const [visible, setVisible] = useState(true);
  const total = portfolio
    ? formatUsd(portfolio.totalUsdMicros)
    : error
      ? 'Unavailable'
      : 'Loading…';

  return (
    <section className="home-card home-portfolio" id="portfolio" aria-labelledby="portfolio-title">
      <div className="home-portfolio-top">
        <div>
          <div className="home-value-label">
            <h2 id="portfolio-title">Total portfolio value</h2>
            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? 'Hide portfolio value' : 'Show portfolio value'}
            >
              <Eye size={17} />
            </button>
          </div>
          <strong className="home-value">{visible ? total : '••••••••'}</strong>
          <p className="home-change">
            {portfolio
              ? 'Live Fuji balance'
              : error
                ? 'Could not read Fuji balance'
                : 'Reading Fuji balance…'}
          </p>
        </div>
        <div className="home-periods" aria-label="Chart period">
          {['1W', '1M', '1Y', 'ALL'].map((item) => (
            <button
              type="button"
              key={item}
              className={period === item ? 'active' : ''}
              aria-pressed={period === item}
              onClick={() => setPeriod(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <span className="home-network">
          <span>▲</span> Avalanche Fuji <span aria-hidden="true">›</span>
        </span>
      </div>

      <HomePortfolioChart />

      <div className="home-assets">
        {portfolio?.positions.map((position) => (
          <div className="home-asset" key={position.id}>
            <span className="home-asset-icon usdc">$</span>
            <span className="home-asset-name">
              <strong>{position.location === 'SUPPLIED' ? 'USDC supplied' : 'USD Coin'}</strong>
              <small>{position.location === 'SUPPLIED' ? 'Aave V3' : 'USDC'}</small>
            </span>
            <span className="home-asset-amount">
              <strong>{formatUsd(position.valueUsdMicros)}</strong>
              <small>{formatToken(position.amountAtomic, position.decimals)} USDC</small>
            </span>
            <span className="home-asset-change">
              {position.location === 'SUPPLIED' ? 'Supplied' : 'Wallet'}
            </span>
          </div>
        ))}
      </div>

      <Link className="home-card-link" href="/portfolio">
        View all assets <ArrowRight size={18} />
      </Link>
    </section>
  );
}
