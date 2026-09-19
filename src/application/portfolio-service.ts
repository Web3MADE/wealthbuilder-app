import type { ChainRef, Portfolio, WalletId } from '@/domain';
import type { ChainPort } from './ports/chain';
import type { PortfolioRepositoryPort } from './ports/repositories';
export class PortfolioService {
  constructor(
    private readonly chain: ChainPort,
    private readonly portfolios: PortfolioRepositoryPort,
  ) {}
  async refresh(walletId: WalletId, chain: ChainRef): Promise<Portfolio> {
    const portfolio = await this.chain.getPortfolio(walletId, chain);
    await this.portfolios.save(portfolio);
    return portfolio;
  }
}
