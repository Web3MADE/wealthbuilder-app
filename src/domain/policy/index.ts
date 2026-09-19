import type { Money } from '../money/index';
import type { AssetId, ChainRef, WalletId } from '../portfolio/index';

export type RiskTier = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
export type ProtocolId = string;
export type AutonomyPolicy = Readonly<{
  enabled: boolean;
  maxTransactionValue: Money;
  sessionMaxCumulativeValue: Money;
  sessionDurationMinutes: number;
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
  riskTolerance: RiskTier;
  autonomy: AutonomyPolicy;
  createdAt: Date;
}>;
export type PolicyViolationCode =
  | 'STALE_PORTFOLIO'
  | 'PRICE_UNAVAILABLE'
  | 'ASSET_NOT_ALLOWED'
  | 'ASSET_EXCLUDED'
  | 'PROTOCOL_NOT_ALLOWED'
  | 'TRANSACTION_LIMIT_EXCEEDED'
  | 'LIQUIDITY_RESERVE_BREACHED'
  | 'INSUFFICIENT_LIQUID_BALANCE'
  | 'AUTONOMY_LIMIT_EXCEEDED';
export type PolicyViolation = Readonly<{ code: PolicyViolationCode; message: string }>;
export type PolicyDecision = Readonly<{
  outcome: 'BLOCKED' | 'REQUIRES_APPROVAL' | 'AUTONOMOUS_ALLOWED';
  actionValue: Money;
  violations: readonly PolicyViolation[];
  evaluatedAt: Date;
}>;
