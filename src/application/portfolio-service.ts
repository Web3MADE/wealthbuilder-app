import type { ChainRef, Portfolio, WalletId } from '@/domain';
import type { ChainPort } from './interfaces/chain';
export class PortfolioService {
  constructor(private readonly chain: ChainPort) {}
  async refresh(walletId: WalletId, chain: ChainRef): Promise<Portfolio> {
    return this.chain.getPortfolio(walletId, chain);
  }
}
