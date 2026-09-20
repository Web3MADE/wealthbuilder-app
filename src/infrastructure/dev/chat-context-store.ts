import {
  atomic,
  usd,
  type AssetRef,
  type PersonalWealthPolicy,
  type PolicySettings,
  type Portfolio,
} from '@/domain';
import type { ChatContextPort } from '@/application/interfaces/chat-context';

const chain = { id: 'avalanche-fuji' } as const;
const walletId = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const assets: readonly AssetRef[] = [
  { id: 'eth', symbol: 'ETH', decimals: 18, isStablecoin: false },
  { id: 'btc', symbol: 'BTC', decimals: 8, isStablecoin: false },
  { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true },
  { id: 'avax', symbol: 'AVAX', decimals: 18, isStablecoin: false },
];

function asset(id: string) {
  return assets.find((candidate) => candidate.id === id)!;
}

function freshPortfolio(now: Date): Portfolio {
  const expiresAt = new Date(now.getTime() + 5 * 60_000);
  return {
    id: 'dev-hakeem-portfolio',
    walletId,
    chain,
    capturedAt: now,
    expiresAt,
    positions: [
      { asset: asset('eth'), amount: atomic(2_480_000_000_000_000_000n, 18), value: usd(6_245_320_000n), location: 'WALLET' },
      { asset: asset('btc'), amount: atomic(3_400_000n, 8), value: usd(3_104_210_000n), location: 'WALLET' },
      { asset: asset('usdc'), amount: atomic(2_078_990_000n, 6), value: usd(2_078_990_000n), location: 'WALLET' },
      { asset: asset('avax'), amount: atomic(12_340_000_000_000_000_000n, 18), value: usd(1_000_000_000n), location: 'WALLET' },
    ],
  };
}

const initialSettings: PolicySettings = {
  allowedAssetIds: ['usdc'],
  excludedAssetIds: ['doge'],
  allowedProtocolIds: ['aave-v3'],
  maxSingleTransactionValue: usd(10_000_000_000n),
  maxAssetConcentrationBps: 7_500,
  minimumLiquidStableReserveBps: 1_000,
  autonomy: { enabled: true, maxTransactionValue: usd(100_000_000n) },
};

/**
 * Deliberately process-local development state. It supplies a repeatable chat
 * context without introducing database persistence to the MVP flow.
 */
export class DevChatContextStore implements ChatContextPort {
  private settings: PolicySettings = initialSettings;
  private version = 1;
  private refreshedPortfolio: Portfolio | null = null;

  private policy(now: Date): PersonalWealthPolicy {
    return {
      id: 'dev-hakeem-policy',
      version: this.version,
      walletId,
      chain,
      ...this.settings,
      createdAt: now,
    };
  }

  async load() {
    const now = new Date();
    const portfolio = this.refreshedPortfolio
      ? {
          ...this.refreshedPortfolio,
          capturedAt: now,
          expiresAt: new Date(now.getTime() + 5 * 60_000),
        }
      : freshPortfolio(now);
    return {
      portfolio,
      policy: this.policy(now),
      quotes: [
        { assetId: 'usdc', priceMicrosPerUnit: 1_000_000n, quotedAt: now, expiresAt: portfolio.expiresAt },
        { assetId: 'eth', priceMicrosPerUnit: 2_518_274_194n, quotedAt: now, expiresAt: portfolio.expiresAt },
        { assetId: 'btc', priceMicrosPerUnit: 91_300_294_118n, quotedAt: now, expiresAt: portfolio.expiresAt },
        { assetId: 'avax', priceMicrosPerUnit: 81_037_277n, quotedAt: now, expiresAt: portfolio.expiresAt },
      ],
      supportedAssets: assets,
      supportedActionTypes: ['SUPPLY'] as const,
    };
  }

  async savePolicy(settings: PolicySettings): Promise<PersonalWealthPolicy> {
    this.settings = {
      ...settings,
      allowedAssetIds: [...settings.allowedAssetIds],
      excludedAssetIds: [...settings.excludedAssetIds],
      allowedProtocolIds: [...settings.allowedProtocolIds],
    };
    this.version += 1;
    return this.policy(new Date());
  }

  recordPortfolio(portfolio: Portfolio) {
    this.refreshedPortfolio = portfolio;
  }
}

const storeKey = Symbol.for('wealthbuilder.devChatContextStore');
export function devChatContextStore(): DevChatContextStore {
  const runtime = globalThis as typeof globalThis & {
    [storeKey]?: DevChatContextStore;
  };
  return (runtime[storeKey] ??= new DevChatContextStore());
}
