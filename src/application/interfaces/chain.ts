import type { ChainRef, Portfolio, WalletId } from '@/domain';
export interface ChainPort {
  getPortfolio(walletId: WalletId, chain: ChainRef): Promise<Portfolio>;
}
