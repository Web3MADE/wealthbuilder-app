'use client';

import { createContext, useContext } from 'react';

export type DelegatedPermission = Readonly<{
  smartAccountAddress: string;
  permissionId: string;
  expiresAt: string;
}>;
export type SmartAccountPort = Readonly<{
  smartAccountAddress: string | null;
  accountStatus: 'checking' | 'inactive' | 'active';
  permission: DelegatedPermission | null;
  setup(): Promise<void>;
  grantAaveUsdcSupplyPermission(amountUsdc: string): Promise<DelegatedPermission>;
}>;

export const SmartAccountContext = createContext<SmartAccountPort | null>(null);

export function useSmartAccount(): SmartAccountPort {
  const account = useContext(SmartAccountContext);
  if (!account) throw new Error('Smart-account provider is unavailable.');
  return account;
}
