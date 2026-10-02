import { address } from '@solana/kit';
import { PortfolioService } from '@/application/portfolio-service';
import type { ChainPort } from '@/application/interfaces/chain';
import { atomic, usd, type AssetRef, type ChainRef, type Portfolio } from '@/domain';
import { fetchSolBalance, type SolanaBalanceRpc } from './solana-client';
import { type SolanaCluster } from './solana-config';

export const nativeSol: AssetRef = {
  id: 'sol',
  symbol: 'SOL',
  decimals: 9,
  isStablecoin: false,
};

export function solanaChain(cluster: SolanaCluster): ChainRef {
  return { id: `solana-${cluster}` };
}

/** Maps a wallet's confirmed native SOL balance into the shared portfolio model. */
export class SolanaPortfolioSource implements ChainPort {
  constructor(
    private readonly rpc: SolanaBalanceRpc,
    private readonly cluster: SolanaCluster,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getPortfolio(walletId: string, chain: ChainRef): Promise<Portfolio> {
    const expectedChain = solanaChain(this.cluster);
    if (chain.id !== expectedChain.id) throw new Error('Unsupported Solana network.');

    let walletAddress;
    try {
      walletAddress = address(walletId);
    } catch {
      throw new Error('Invalid Solana wallet address.');
    }

    const lamports = await fetchSolBalance(this.rpc, walletAddress);
    const capturedAt = this.clock();
    return {
      id: `${expectedChain.id}:${walletAddress}:${capturedAt.getTime()}`,
      walletId: walletAddress,
      chain: expectedChain,
      capturedAt,
      expiresAt: new Date(capturedAt.getTime() + 60_000),
      positions: [
        {
          asset: nativeSol,
          amount: atomic(lamports, nativeSol.decimals),
          // SOL pricing is intentionally outside SOL-04 scope.
          value: usd(0n),
          location: 'WALLET',
        },
      ],
    };
  }
}

export function solanaPortfolioService(rpc: SolanaBalanceRpc, cluster: SolanaCluster) {
  return new PortfolioService(new SolanaPortfolioSource(rpc, cluster));
}
