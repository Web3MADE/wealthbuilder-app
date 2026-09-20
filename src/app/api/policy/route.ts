import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { policyService } from '@/bootstrap';
import { avalancheFuji } from '@/config';
import { usd, type PersonalWealthPolicy } from '@/domain';
import { readSession, sessionCookieName } from '@/infrastructure/auth/session';

const inputSchema = z.object({
  allowedAssetIds: z.array(z.string().trim().min(1)).max(20),
  excludedAssetIds: z.array(z.string().trim().min(1)).max(20),
  allowedProtocolIds: z.array(z.string().trim().min(1)).max(20),
  maxSingleTransactionUsd: z.string(),
  maxAutonomousTransactionUsd: z.string(),
  maxAssetConcentrationPercent: z.string(),
  minimumLiquidStableReservePercent: z.string(),
  autonomyEnabled: z.boolean(),
});

function walletFrom(request: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  return secret ? readSession(request.cookies.get(sessionCookieName)?.value, secret) : null;
}

function micros(value: string): bigint | null {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(value)) return null;
  const [whole = '0', fraction = ''] = value.split('.');
  if (whole.length > 13) return null;
  const amount = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0') || '0');
  return amount <= 9_223_372_036_854_775_807n ? amount : null;
}

function basisPoints(value: string): number | null {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole = '0', fraction = ''] = value.split('.');
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, '0') || '0');
  return bps <= 10_000 ? bps : null;
}

function serialize(policy: PersonalWealthPolicy | null) {
  if (!policy) return null;
  const dollars = (value: bigint) =>
    `${value / 1_000_000n}.${(value % 1_000_000n).toString().padStart(6, '0')}`;
  return {
    id: policy.id,
    version: policy.version,
    wallet: policy.walletId,
    allowedAssetIds: policy.allowedAssetIds,
    excludedAssetIds: policy.excludedAssetIds,
    allowedProtocolIds: policy.allowedProtocolIds,
    maxSingleTransactionUsd: dollars(policy.maxSingleTransactionValue.micros),
    maxAutonomousTransactionUsd: dollars(policy.autonomy.maxTransactionValue.micros),
    maxAssetConcentrationPercent: (policy.maxAssetConcentrationBps / 100).toFixed(2),
    minimumLiquidStableReservePercent: (policy.minimumLiquidStableReserveBps / 100).toFixed(2),
    autonomyEnabled: policy.autonomy.enabled,
    createdAt: policy.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const wallet = walletFrom(request);
  if (!wallet)
    return NextResponse.json({ error: 'Authenticate your wallet first.' }, { status: 401 });
  const policy = await policyService().load(wallet, avalancheFuji);
  return NextResponse.json({ policy: serialize(policy) });
}

export async function POST(request: NextRequest) {
  const wallet = walletFrom(request);
  if (!wallet)
    return NextResponse.json({ error: 'Authenticate your wallet first.' }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Check the policy fields.' }, { status: 400 });
  const input = parsed.data;
  const single = micros(input.maxSingleTransactionUsd);
  const autonomous = micros(input.maxAutonomousTransactionUsd);
  const concentration = basisPoints(input.maxAssetConcentrationPercent);
  const reserve = basisPoints(input.minimumLiquidStableReservePercent);
  const errors: Record<string, string> = {};
  if (single === null)
    errors.maxSingleTransactionUsd = 'Use a positive dollar amount with at most six decimals.';
  if (autonomous === null)
    errors.maxAutonomousTransactionUsd = 'Use a dollar amount with at most six decimals.';
  if (concentration === null)
    errors.maxAssetConcentrationPercent =
      'Use a percentage from 0 to 100 with at most two decimals.';
  if (reserve === null)
    errors.minimumLiquidStableReservePercent =
      'Use a percentage from 0 to 100 with at most two decimals.';
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 400 });
  const result = await policyService().save(wallet, avalancheFuji, {
    allowedAssetIds: [...new Set(input.allowedAssetIds.map((id) => id.toLowerCase()))],
    excludedAssetIds: [...new Set(input.excludedAssetIds.map((id) => id.toLowerCase()))],
    allowedProtocolIds: [...new Set(input.allowedProtocolIds.map((id) => id.toLowerCase()))],
    maxSingleTransactionValue: usd(single!),
    maxAssetConcentrationBps: concentration!,
    minimumLiquidStableReserveBps: reserve!,
    autonomy: { enabled: input.autonomyEnabled, maxTransactionValue: usd(autonomous!) },
  });
  if (!result.policy) {
    const fieldNames: Record<string, string> = {
      maxSingleTransactionValue: 'maxSingleTransactionUsd',
      maxAutonomousTransactionValue: 'maxAutonomousTransactionUsd',
      maxAssetConcentrationBps: 'maxAssetConcentrationPercent',
      minimumLiquidStableReserveBps: 'minimumLiquidStableReservePercent',
    };
    const fieldErrors = Object.fromEntries(
      Object.entries(result.errors).map(([key, message]) => [fieldNames[key] ?? key, message]),
    );
    return NextResponse.json({ errors: fieldErrors }, { status: 400 });
  }
  return NextResponse.json({ policy: serialize(result.policy) });
}
