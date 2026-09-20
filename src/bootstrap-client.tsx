'use client';

import { AppShell } from '@/presentation/shell/app-shell';
import { WalletProviders } from '@/infrastructure/wallet/providers';
import { useWalletConnection } from '@/infrastructure/wallet/use-wallet-connection';

export { WalletProviders };

export function ProductPage({ view }: { view: 'home' | 'portfolio' | 'policy' }) {
  const wallet = useWalletConnection();
  return <AppShell view={view} wallet={wallet} />;
}
