import { usd, type PersonalWealthPolicy, type PolicySettings } from '@/domain';
import { fujiKernelAccount } from './fuji-portfolio-source';

const chain = { id: 'avalanche-fuji' } as const;

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
 * The active Wealth Policy for the local MVP. Keeping this in Infrastructure
 * makes the lack of persistence explicit while every product surface reads
 * the same policy used by chat and execution evaluation.
 */
export class DevPersonalWealthPolicyStore {
  private settings: PolicySettings = initialSettings;
  private version = 1;

  load(walletId: string = fujiKernelAccount, now = new Date()): PersonalWealthPolicy {
    return {
      id: 'dev-hakeem-policy',
      version: this.version,
      walletId,
      chain,
      ...this.settings,
      createdAt: now,
    };
  }

  save(settings: PolicySettings): PersonalWealthPolicy {
    this.settings = {
      ...settings,
      allowedAssetIds: [...settings.allowedAssetIds],
      excludedAssetIds: [...settings.excludedAssetIds],
      allowedProtocolIds: [...settings.allowedProtocolIds],
    };
    this.version += 1;
    return this.load();
  }
}

const storeKey = Symbol.for('wealthbuilder.devPersonalWealthPolicyStore');

export function devPersonalWealthPolicyStore(): DevPersonalWealthPolicyStore {
  const runtime = globalThis as typeof globalThis & { [storeKey]?: DevPersonalWealthPolicyStore };
  return (runtime[storeKey] ??= new DevPersonalWealthPolicyStore());
}
