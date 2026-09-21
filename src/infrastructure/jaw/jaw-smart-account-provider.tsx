'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  SmartAccountContext,
  type DelegatedPermission,
} from '@/application/interfaces/smart-account';
import { JawAavePermissionClient } from './jaw-aave-permission';

/** Infrastructure composition for the browser-only JAW passkey and permission SDK. */
export function JawSmartAccountProvider({ children }: { children: ReactNode }) {
  const client = useRef<JawAavePermissionClient | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [permission, setPermission] = useState<DelegatedPermission | null>(null);
  const value = useMemo(
    () => ({
      smartAccountAddress,
      accountStatus: smartAccountAddress ? ('active' as const) : ('inactive' as const),
      permission,
      async setup() {
        const headless = await fetch('/api/jaw/dev-account');
        if (headless.ok) {
          const payload = (await headless.json()) as { smartAccountAddress: string };
          setSmartAccountAddress(payload.smartAccountAddress);
          setPermission(null);
          return;
        }
        client.current ??= new JawAavePermissionClient();
        setSmartAccountAddress(await client.current.createOrLoad());
        setPermission(null);
      },
      async grantAaveUsdcSupplyPermission(amountUsdc: string) {
        const headless = await fetch('/api/jaw/dev-permission', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ amountUsdc }),
        });
        if (headless.ok) {
          const granted = (await headless.json()) as DelegatedPermission;
          setSmartAccountAddress(granted.smartAccountAddress);
          setPermission(granted);
          return granted;
        }
        client.current ??= new JawAavePermissionClient();
        const granted = await client.current.grantAaveUsdcSupplyPermission(amountUsdc);
        setSmartAccountAddress(granted.smartAccountAddress);
        setPermission(granted);
        return granted;
      },
    }),
    [permission, smartAccountAddress],
  );
  return <SmartAccountContext.Provider value={value}>{children}</SmartAccountContext.Provider>;
}
