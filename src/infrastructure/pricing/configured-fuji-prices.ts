import type { PriceProviderPort } from '@/application/interfaces/pricing';
import type { AssetRef, PriceQuote } from '@/domain';

// Fuji has no reliable fiat market price. Only the configured test stablecoin is
// assigned a nominal $1 value; other assets remain unpriced (zero USD value).
export class ConfiguredFujiPrices implements PriceProviderPort {
  async getQuotes(assets: readonly AssetRef[]): Promise<readonly PriceQuote[]> {
    const now = new Date();
    return assets.map((asset): PriceQuote => ({
      assetId: asset.id,
      priceMicrosPerUnit: asset.id === 'usdc' ? 1_000_000n : 0n,
      quotedAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
    }));
  }
}
