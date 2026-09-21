'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SmartAccountContext, type DelegatedPermission } from '@/application/interfaces/smart-account';

/** Browser facade for the current WealthBuilder Account implementation. */
export function ZeroDevSmartAccountProvider({ children }: { children: ReactNode }) {
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<'checking' | 'inactive' | 'active'>('checking');
  const [permission, setPermission] = useState<DelegatedPermission | null>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/zerodev/account')
      .then(async (response) => {
        const payload = await response.json() as { smartAccountAddress?: string };
        if (!response.ok || !payload.smartAccountAddress) throw new Error('Account unavailable');
        if (active) { setSmartAccountAddress(payload.smartAccountAddress); setAccountStatus('active'); }
      })
      .catch(() => { if (active) setAccountStatus('inactive'); });
    return () => { active = false; };
  }, []);
  const value = useMemo(() => ({
    smartAccountAddress,
    accountStatus,
    permission,
    async setup() {
      const response = await fetch('/api/zerodev/account');
      const payload = await response.json() as { smartAccountAddress?: string; error?: string };
      if (!response.ok || !payload.smartAccountAddress) throw new Error(payload.error ?? 'Could not activate your WealthBuilder Account.');
      setSmartAccountAddress(payload.smartAccountAddress);
      setAccountStatus('active');
      setPermission(null);
    },
    async grantAaveUsdcSupplyPermission(amountUsdc: string) {
      const response = await fetch('/api/zerodev/permission', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amountUsdc }) });
      const payload = await response.json() as DelegatedPermission & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not prepare your account authorization.');
      setSmartAccountAddress(payload.smartAccountAddress);
      setPermission(payload);
      return payload;
    },
  }), [accountStatus, permission, smartAccountAddress]);
  return <SmartAccountContext.Provider value={value}>{children}</SmartAccountContext.Provider>;
}
