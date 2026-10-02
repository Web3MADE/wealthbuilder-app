'use client';

import { PrivySolanaProvider } from '@/infrastructure/solana/privy-solana-provider';
import { SolanaProvider } from '@/infrastructure/solana/solana-provider';
import { ZeroDevSmartAccountProvider } from '@/infrastructure/zerodev/zerodev-smart-account-provider';

export function WalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivySolanaProvider>
      <SolanaProvider>{children}</SolanaProvider>
    </PrivySolanaProvider>
  );
}

export function ChatAccountProvider({ children }: { children: React.ReactNode }) {
  return <ZeroDevSmartAccountProvider>{children}</ZeroDevSmartAccountProvider>;
}
