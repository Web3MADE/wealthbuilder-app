import type { PolicyService } from '@/application/policy-service';
import { usd, type PersonalWealthPolicy, type PolicySettings } from '@/domain';
import { solanaChain } from './solana-portfolio-source';
import type { SolanaCluster } from './solana-config';

/** Internal policy scope for native SOL custody; it is not a DeFi protocol or executable action. */
export const solanaNativePolicyScope = 'solana-native';

export const defaultSolanaPolicySettings: PolicySettings = {
  allowedAssetIds: ['sol'],
  excludedAssetIds: [],
  allowedProtocolIds: [solanaNativePolicyScope],
  maxSingleTransactionValue: usd(1_000_000_000n),
  maxAssetConcentrationBps: 10_000,
  minimumLiquidStableReserveBps: 0,
  autonomy: { enabled: false, maxTransactionValue: usd(0n) },
};

export function validateSolanaPolicySettings(settings: PolicySettings): Record<string, string> {
  const errors: Record<string, string> = {};
  if (settings.allowedAssetIds.some((assetId) => assetId !== 'sol'))
    errors.allowedAssetIds = 'SOL is the only supported Solana asset.';
  if (settings.excludedAssetIds.some((assetId) => assetId !== 'sol'))
    errors.excludedAssetIds = 'SOL is the only supported Solana asset.';
  if (
    settings.allowedProtocolIds.length !== 1 ||
    settings.allowedProtocolIds[0] !== solanaNativePolicyScope
  )
    errors.allowedProtocolIds = 'Solana policy currently supports native SOL custody only.';
  return errors;
}

export class SolanaPolicyContext {
  readonly chain;
  readonly supportedAssetIds = ['sol'] as const;

  constructor(readonly cluster: SolanaCluster) {
    this.chain = solanaChain(cluster);
  }

  async load(policyService: PolicyService, walletId: string): Promise<PersonalWealthPolicy | null> {
    return policyService.load(walletId, this.chain);
  }

  async save(policyService: PolicyService, walletId: string, settings: PolicySettings) {
    const errors = validateSolanaPolicySettings(settings);
    if (Object.keys(errors).length > 0) return { policy: null, errors };
    return policyService.save(walletId, this.chain, settings);
  }
}
