'use client';

import { useCallback, useEffect, useState } from 'react';

export type ActivePolicyView = Readonly<{
  version: number;
  riskLevel: string;
  minimumLiquidReservePercent: number;
  maxAssetConcentrationPercent: number;
  transactionLimitUsd: string;
  autonomyEnabled: boolean;
  autonomyLimitUsd: string;
  allowedProtocols: readonly string[];
}>;

export function useActivePolicy() {
  const [policy, setPolicy] = useState<ActivePolicyView | null>(null);
  const [error, setError] = useState(false);
  const refresh = useCallback(() => {
    fetch('/api/policy/current', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Active policy unavailable');
        return response.json() as Promise<ActivePolicyView>;
      })
      .then((next) => {
        setPolicy(next);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('wealthbuilder-policy-updated', refresh);
    return () => window.removeEventListener('wealthbuilder-policy-updated', refresh);
  }, [refresh]);

  return { policy, error, refresh };
}

export function formatPolicyUsd(value: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value));
}
