'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Portfolio } from '@/domain';
import { solanaChain, solanaPortfolioService } from './solana-portfolio-source';
import { useSolanaClient, useSolanaCluster } from './solana-provider';

export type SolanaPortfolioState = Readonly<{
  portfolio: Portfolio | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  refresh: () => Promise<Portfolio | null>;
}>;

export function useSolanaPortfolio(walletAddress: string | null): SolanaPortfolioState {
  const client = useSolanaClient();
  const { cluster } = useSolanaCluster();
  const service = useMemo(() => solanaPortfolioService(client.rpc, cluster), [client, cluster]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [status, setStatus] = useState<SolanaPortfolioState['status']>('idle');
  const refresh = useCallback(async (): Promise<Portfolio | null> => {
    if (!walletAddress) {
      setPortfolio(null);
      setStatus('idle');
      return null;
    }
    setStatus('loading');
    try {
      const next = await service.refresh(walletAddress, solanaChain(cluster));
      setPortfolio(next);
      setStatus('ready');
      return next;
    } catch {
      setPortfolio(null);
      setStatus('error');
      return null;
    }
  }, [cluster, service, walletAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { portfolio, status, refresh };
}
