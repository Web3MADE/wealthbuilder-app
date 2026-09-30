'use client';

import { useSolanaCluster } from '@/infrastructure/solana/solana-provider';
import { useSolanaPortfolio } from '@/infrastructure/solana/use-solana-portfolio';
import { useSolanaWallet } from '@/infrastructure/solana/use-solana-wallet';
import { SolanaDemoShell } from './SolanaDemoShell';
import './solana-wallet.css';

export function SolanaWalletScreen() {
  const { cluster } = useSolanaCluster();
  const wallet = useSolanaWallet();
  const portfolio = useSolanaPortfolio(wallet.address);

  return <SolanaDemoShell wallet={wallet} cluster={cluster} portfolio={portfolio} />;
}
