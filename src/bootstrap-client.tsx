'use client';

import { AppShell } from '@/presentation/shell/app-shell';
import { WalletProviders as WalletProviderBase } from '@/infrastructure/wallet/providers';
import { useWalletConnection } from '@/infrastructure/wallet/use-wallet-connection';
import { ZeroDevSmartAccountProvider } from '@/infrastructure/zerodev/zerodev-smart-account-provider';
import { SolanaProvider } from '@/infrastructure/solana/solana-provider';

export function WalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <WalletProviderBase>
      <SolanaProvider>
        <ZeroDevSmartAccountProvider>{children}</ZeroDevSmartAccountProvider>
      </SolanaProvider>
    </WalletProviderBase>
  );
}

export function ProductPage({ view }: { view: 'home' | 'portfolio' | 'policy' }) {
  const wallet = useWalletConnection();
  return <AppShell view={view} wallet={wallet} />;
}
