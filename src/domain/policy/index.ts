import type { Money } from '../money/index';
import type { AssetId, ChainRef, WalletId } from '../portfolio/index';

export type ProtocolId = string;
export type AutonomyPolicy = Readonly<{
  enabled: boolean;
  maxTransactionValue: Money;
}>;
export type PersonalWealthPolicy = Readonly<{
  id: string;
  version: number;
  walletId: WalletId;
  chain: ChainRef;
  allowedAssetIds: readonly AssetId[];
  excludedAssetIds: readonly AssetId[];
  maxAssetConcentrationBps: number;
  minimumLiquidStableReserveBps: number;
  maxSingleTransactionValue: Money;
  allowedProtocolIds: readonly ProtocolId[];
  autonomy: AutonomyPolicy;
  createdAt: Date;
}>;
export type PolicySettings = Pick<
  PersonalWealthPolicy,
  | 'allowedAssetIds'
  | 'excludedAssetIds'
  | 'allowedProtocolIds'
  | 'maxSingleTransactionValue'
  | 'maxAssetConcentrationBps'
  | 'minimumLiquidStableReserveBps'
  | 'autonomy'
>;

export function validatePolicySettings(settings: PolicySettings): Record<string, string> {
  const errors: Record<string, string> = {};
  if (settings.allowedAssetIds.length === 0)
    errors.allowedAssetIds = 'Select at least one allowed asset.';
  if (settings.allowedProtocolIds.length === 0)
    errors.allowedProtocolIds = 'Select at least one allowed protocol.';
  if (settings.maxSingleTransactionValue.micros <= 0n)
    errors.maxSingleTransactionValue = 'Enter a positive transaction limit.';
  if (
    settings.autonomy.maxTransactionValue.micros < 0n ||
    settings.autonomy.maxTransactionValue.micros > settings.maxSingleTransactionValue.micros
  )
    errors.maxAutonomousTransactionValue =
      'Autonomous limit must be between zero and the single transaction limit.';
  if (
    !Number.isInteger(settings.maxAssetConcentrationBps) ||
    settings.maxAssetConcentrationBps < 0 ||
    settings.maxAssetConcentrationBps > 10_000
  )
    errors.maxAssetConcentrationBps = 'Concentration must be between 0% and 100%.';
  if (
    !Number.isInteger(settings.minimumLiquidStableReserveBps) ||
    settings.minimumLiquidStableReserveBps < 0 ||
    settings.minimumLiquidStableReserveBps > 10_000
  )
    errors.minimumLiquidStableReserveBps = 'Reserve must be between 0% and 100%.';
  return errors;
}
export type PolicyViolationCode =
  | 'PRICE_UNAVAILABLE'
  | 'ASSET_NOT_ALLOWED'
  | 'ASSET_EXCLUDED'
  | 'PROTOCOL_NOT_ALLOWED'
  | 'TRANSACTION_LIMIT_EXCEEDED'
  | 'ASSET_CONCENTRATION_EXCEEDED'
  | 'LIQUIDITY_RESERVE_BREACHED'
  | 'AUTONOMY_LIMIT_EXCEEDED';
export type PolicyViolation = Readonly<{
  code: PolicyViolationCode;
  details: Readonly<Record<string, string>>;
}>;
export type PolicyDecision = Readonly<{
  outcome: 'BLOCKED' | 'REQUIRES_APPROVAL' | 'AUTONOMOUS_ALLOWED';
  actionValue: Money;
  violations: readonly PolicyViolation[];
  evaluatedAt: Date;
}>;
