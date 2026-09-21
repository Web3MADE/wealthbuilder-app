import { NextResponse } from 'next/server';
import { devPersonalWealthPolicyStore } from '@/infrastructure/dev/dev-policy-store';

export const runtime = 'nodejs';

function riskLevel(maxAssetConcentrationBps: number) {
  if (maxAssetConcentrationBps <= 5_000) return 'Conservative';
  if (maxAssetConcentrationBps <= 7_500) return 'Moderate';
  return 'Growth';
}

function protocolLabel(protocol: string) {
  return protocol === 'aave-v3' ? 'Aave V3' : protocol;
}

export async function GET() {
  const policy = devPersonalWealthPolicyStore().load();
  return NextResponse.json({
    version: policy.version,
    riskLevel: riskLevel(policy.maxAssetConcentrationBps),
    minimumLiquidReservePercent: policy.minimumLiquidStableReserveBps / 100,
    maxAssetConcentrationPercent: policy.maxAssetConcentrationBps / 100,
    transactionLimitUsd: (Number(policy.maxSingleTransactionValue.micros) / 1_000_000).toString(),
    autonomyEnabled: policy.autonomy.enabled,
    autonomyLimitUsd: (Number(policy.autonomy.maxTransactionValue.micros) / 1_000_000).toString(),
    allowedProtocols: policy.allowedProtocolIds.map(protocolLabel),
  });
}
