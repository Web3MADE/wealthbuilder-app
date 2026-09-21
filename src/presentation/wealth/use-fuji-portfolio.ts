'use client';

import { useEffect, useState } from 'react';

export type FujiPortfolioView = Readonly<{
  wallet: string;
  capturedAt: string;
  totalUsdMicros: string;
  positions: readonly Readonly<{
    id: string;
    symbol: string;
    amountAtomic: string;
    decimals: number;
    valueUsdMicros: string;
    location: 'WALLET' | 'SUPPLIED';
    protocolId: string | null;
  }>[];
}>;

export function useFujiPortfolio() {
  const [portfolio, setPortfolio] = useState<FujiPortfolioView | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/portfolio/current', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Fuji portfolio unavailable');
        return response.json() as Promise<FujiPortfolioView>;
      })
      .then((next) => {
        if (active) setPortfolio(next);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { portfolio, error };
}

export function formatUsd(micros: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(BigInt(micros)) / 1_000_000);
}

export function formatToken(amountAtomic: string, decimals: number) {
  const value = Number(BigInt(amountAtomic)) / 10 ** decimals;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value);
}
