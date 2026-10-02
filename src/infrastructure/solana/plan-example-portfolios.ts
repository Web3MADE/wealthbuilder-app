import type { PublicSolanaPortfolio } from './opendex-solana-portfolio';

export const planExamplePresets = ['sol-heavy', 'stablecoin-saver', 'diversified-crypto'] as const;
export type PlanExamplePreset = (typeof planExamplePresets)[number];

const examples: Record<PlanExamplePreset, PublicSolanaPortfolio> = {
  'sol-heavy': {
    source: 'example',
    label: 'SOL-heavy holder',
    solBalance: '18.4',
    solUsdValue: null,
    topTokenHoldings: [],
    approximateTotalUsdValue: null,
    isPartial: true,
  },
  'stablecoin-saver': {
    source: 'example',
    label: 'Stablecoin-heavy saver',
    solBalance: '1.3',
    solUsdValue: null,
    topTokenHoldings: [
      { name: 'USD Coin', symbol: 'USDC', amount: '620', usdValue: 620 },
      { name: 'Tether USD', symbol: 'USDT', amount: '190', usdValue: 190 },
    ],
    approximateTotalUsdValue: 810,
    isPartial: true,
  },
  'diversified-crypto': {
    source: 'example',
    label: 'Diversified crypto holder',
    solBalance: '4.1',
    solUsdValue: null,
    topTokenHoldings: [
      { name: 'Jupiter', symbol: 'JUP', amount: '830', usdValue: null },
      { name: 'USD Coin', symbol: 'USDC', amount: '260', usdValue: 260 },
    ],
    approximateTotalUsdValue: 260,
    isPartial: true,
  },
};

export function planExamplePortfolio(preset: PlanExamplePreset): PublicSolanaPortfolio {
  return examples[preset];
}
