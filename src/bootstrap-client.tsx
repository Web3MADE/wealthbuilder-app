'use client';

import { PrivySolanaProvider } from '@/infrastructure/solana/privy-solana-provider';
import { SolanaProvider } from '@/infrastructure/solana/solana-provider';

export function WalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivySolanaProvider>
      <SolanaProvider>{children}</SolanaProvider>
    </PrivySolanaProvider>
  );
}
