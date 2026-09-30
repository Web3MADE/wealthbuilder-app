'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Portfolio } from '@/domain';
import { solanaChain, solanaPortfolioService } from './solana-portfolio-source';
import { useSolanaClient, useSolanaCluster } from './solana-provider';

export type SolanaPortfolioState = Readonly<{
  portfolio: Portfolio | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  refresh: () => void;
}>;

export function useSolanaPortfolio(walletAddress: string | null): SolanaPortfolioState {
  const client = useSolanaClient();
  const { cluster } = useSolanaCluster();
  const service = useMemo(() => solanaPortfolioService(client.rpc, cluster), [client, cluster]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [status, setStatus] = useState<SolanaPortfolioState['status']>('idle');
  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);

  useEffect(() => {
    if (!walletAddress) {
      setPortfolio(null);
      setStatus('idle');
      return;
    }
    let current = true;
    setStatus('loading');
    void service
      .refresh(walletAddress, solanaChain(cluster))
      .then((next) => {
        if (!current) return;
        setPortfolio(next);
        setStatus('ready');
      })
      .catch(() => {
        if (current) {
          setPortfolio(null);
          setStatus('error');
        }
      });
    return () => {
      current = false;
    };
  }, [cluster, refreshCount, service, walletAddress]);

  return { portfolio, status, refresh };
}
