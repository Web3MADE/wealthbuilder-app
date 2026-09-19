import type { AtomicAmount, Money } from '../money/index';

export type ChainRef = Readonly<{ id: string }>;
export type WalletId = string;
export type AssetId = string;
export type AssetRef = Readonly<{
  id: AssetId;
  symbol: string;
  decimals: number;
  isStablecoin: boolean;
}>;
export type Position = Readonly<{
  asset: AssetRef;
  amount: AtomicAmount;
  value: Money;
  location: 'WALLET' | 'SUPPLIED';
  protocolId?: string;
}>;
export type Portfolio = Readonly<{
  id: string;
  walletId: WalletId;
  chain: ChainRef;
  capturedAt: Date;
  expiresAt: Date;
  positions: readonly Position[];
}>;
export type PriceQuote = Readonly<{
  assetId: AssetId;
  priceMicrosPerUnit: bigint;
  quotedAt: Date;
  expiresAt: Date;
}>;
export const portfolioValue = (portfolio: Portfolio): Money => ({
  currency: 'USD',
  micros: portfolio.positions.reduce((total, position) => total + position.value.micros, 0n),
});
