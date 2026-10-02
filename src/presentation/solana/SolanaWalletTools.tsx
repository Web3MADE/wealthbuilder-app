'use client';

import type { SolanaCluster } from '@/infrastructure/solana/solana-config';
import { SolanaTransferPanel } from './SolanaTransferPanel';
import { SolanaPolicyPanel } from './SolanaPolicyPanel';

export function SolanaWalletTools({
  address,
  balanceLamports,
  canSignTransactions,
  cluster,
  portfolioId,
  signMessage,
  onConfirmed,
}: {
  address: string;
  balanceLamports: bigint | null;
  canSignTransactions: boolean;
  cluster: SolanaCluster;
  portfolioId: string;
  signMessage: (message: string) => Promise<Uint8Array>;
  onConfirmed: () => void;
}) {
  return (
    <details className="solana-wallet-tools">
      <summary>More wallet controls</summary>
      <div className="solana-wallet-tools-content">
        <SolanaPolicyPanel address={address} cluster={cluster} signMessage={signMessage} />
        <SolanaTransferPanel
          walletAddress={address}
          balanceLamports={balanceLamports}
          canSignTransactions={canSignTransactions}
          cluster={cluster}
          portfolioId={portfolioId}
          onConfirmed={onConfirmed}
        />
      </div>
    </details>
  );
}
