import type { AssetRef, PriceQuote } from '@/domain';
export interface PriceProviderPort {
  getQuotes(assets: readonly AssetRef[]): Promise<readonly PriceQuote[]>;
}
