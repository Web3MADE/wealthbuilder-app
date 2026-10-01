'use client';

import { WalletProviders } from '@/infrastructure/wallet/providers';
import { useWalletConnection } from '@/infrastructure/wallet/use-wallet-connection';
import { ZeroDevSmartAccountProvider } from '@/infrastructure/zerodev/zerodev-smart-account-provider';
import { AppShell } from '@/presentation/shell/app-shell';

/**
 * Keeps dormant Fuji screens self-contained on the hackathon branch. The
 * canonical Solana route does not import this module or its EVM providers.
 */
export function LegacyProductPage({ view }: { view: 'home' | 'portfolio' | 'policy' }) {
  return (
    <WalletProviders>
      <ZeroDevSmartAccountProvider>
        <LegacyProductContent view={view} />
      </ZeroDevSmartAccountProvider>
    </WalletProviders>
  );
}

function LegacyProductContent({ view }: { view: 'home' | 'portfolio' | 'policy' }) {
  const wallet = useWalletConnection();
  return <AppShell view={view} wallet={wallet} />;
}
