import { usd, type PersonalWealthPolicy } from '@/domain';
import { policies } from './schema';

export type PolicyRow = typeof policies.$inferSelect;

export function toPolicy(row: PolicyRow): PersonalWealthPolicy {
  return {
    id: row.id,
    version: row.version,
    walletId: row.walletAddress,
    chain: { id: row.chainId },
    allowedAssetIds: row.allowedAssetIds,
    excludedAssetIds: row.excludedAssetIds,
    allowedProtocolIds: row.allowedProtocolIds,
    maxSingleTransactionValue: usd(row.maxSingleTransactionMicros),
    maxAssetConcentrationBps: row.maxAssetConcentrationBps,
    minimumLiquidStableReserveBps: row.minimumLiquidStableReserveBps,
    autonomy: {
      enabled: row.autonomyEnabled,
      maxTransactionValue: usd(row.maxAutonomousTransactionMicros),
    },
    createdAt: row.createdAt,
  };
}

export function fromPolicy(policy: PersonalWealthPolicy): typeof policies.$inferInsert {
  return {
    id: policy.id,
    version: policy.version,
    walletAddress: policy.walletId,
    chainId: policy.chain.id,
    allowedAssetIds: [...policy.allowedAssetIds],
    excludedAssetIds: [...policy.excludedAssetIds],
    allowedProtocolIds: [...policy.allowedProtocolIds],
    maxSingleTransactionMicros: policy.maxSingleTransactionValue.micros,
    maxAutonomousTransactionMicros: policy.autonomy.maxTransactionValue.micros,
    autonomyEnabled: policy.autonomy.enabled,
    maxAssetConcentrationBps: policy.maxAssetConcentrationBps,
    minimumLiquidStableReserveBps: policy.minimumLiquidStableReserveBps,
    createdAt: policy.createdAt,
  };
}
