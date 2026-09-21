import {
  type AssetRef,
  type PersonalWealthPolicy,
  type PolicySettings,
  type Portfolio,
} from '@/domain';
import type { ChatContextPort } from '@/application/interfaces/chat-context';
import { fujiKernelAccount, fujiPortfolioSource } from './fuji-portfolio-source';
import { devPersonalWealthPolicyStore } from './dev-policy-store';

const walletId = fujiKernelAccount;
const assets: readonly AssetRef[] = [
  { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true },
];

/**
 * Deliberately process-local development state. It supplies a repeatable chat
 * context without introducing database persistence to the MVP flow.
 */
export class DevChatContextStore implements ChatContextPort {
  async load(walletOverride?: string) {
    const now = new Date();
    const portfolio = await fujiPortfolioSource().refresh(walletOverride ?? walletId);
    const policy = devPersonalWealthPolicyStore().load(
      walletOverride?.toLowerCase() ?? walletId,
      now,
    );
    const contextWalletId = walletOverride?.toLowerCase() ?? policy.walletId;
    return {
      portfolio: { ...portfolio, walletId: contextWalletId },
      policy: { ...policy, walletId: contextWalletId },
      quotes: [
        {
          assetId: 'usdc',
          priceMicrosPerUnit: 1_000_000n,
          quotedAt: now,
          expiresAt: portfolio.expiresAt,
        },
      ],
      supportedAssets: assets,
      supportedActionTypes: ['SUPPLY'] as const,
    };
  }

  async savePolicy(settings: PolicySettings): Promise<PersonalWealthPolicy> {
    return devPersonalWealthPolicyStore().save(settings);
  }

  recordPortfolio(portfolio: Portfolio) {
    fujiPortfolioSource().record(portfolio);
  }
}

const storeKey = Symbol.for('wealthbuilder.devChatContextStore');
export function devChatContextStore(): DevChatContextStore {
  const runtime = globalThis as typeof globalThis & {
    [storeKey]?: DevChatContextStore;
  };
  return (runtime[storeKey] ??= new DevChatContextStore());
}
