import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { policyService } from '@/bootstrap';
import { usd, type PersonalWealthPolicy } from '@/domain';
import { SolanaPolicyContext } from '@/infrastructure/solana/solana-policy-context';
import {
  readSolanaPolicySession,
  solanaPolicySessionCookieName,
} from '@/infrastructure/solana/solana-policy-session';

const inputSchema = z.object({
  cluster: z.enum(['devnet', 'localnet']),
  allowedSol: z.boolean(),
  maxSingleTransactionUsd: z.string(),
  maxAutonomousTransactionUsd: z.string(),
  maxAssetConcentrationPercent: z.string(),
  minimumLiquidStableReservePercent: z.string(),
  autonomyEnabled: z.boolean(),
});

function walletFrom(request: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  return secret
    ? readSolanaPolicySession(request.cookies.get(solanaPolicySessionCookieName)?.value, secret)
    : null;
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
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0') || '0');
  return result <= 10_000 ? result : null;
}

function serialize(policy: PersonalWealthPolicy | null) {
  if (!policy) return null;
  const dollars = (value: bigint) =>
    `${value / 1_000_000n}.${(value % 1_000_000n).toString().padStart(6, '0')}`;
  return {
    version: policy.version,
    allowedSol: policy.allowedAssetIds.includes('sol') && !policy.excludedAssetIds.includes('sol'),
    maxSingleTransactionUsd: dollars(policy.maxSingleTransactionValue.micros),
    maxAutonomousTransactionUsd: dollars(policy.autonomy.maxTransactionValue.micros),
    maxAssetConcentrationPercent: (policy.maxAssetConcentrationBps / 100).toFixed(2),
    minimumLiquidStableReservePercent: (policy.minimumLiquidStableReserveBps / 100).toFixed(2),
    autonomyEnabled: policy.autonomy.enabled,
  };
}

export async function GET(request: NextRequest) {
  const wallet = walletFrom(request);
  const cluster = request.nextUrl.searchParams.get('cluster');
  if (!wallet)
    return NextResponse.json({ error: 'Sign in with your Solana wallet first.' }, { status: 401 });
  if (cluster !== 'devnet' && cluster !== 'localnet')
    return NextResponse.json({ error: 'Invalid Solana cluster.' }, { status: 400 });
  const policy = await new SolanaPolicyContext(cluster).load(policyService(), wallet);
  return NextResponse.json({ policy: serialize(policy) });
}

export async function POST(request: NextRequest) {
  const wallet = walletFrom(request);
  if (!wallet)
    return NextResponse.json({ error: 'Sign in with your Solana wallet first.' }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Check the policy fields.' }, { status: 400 });
  const input = parsed.data;
  const single = micros(input.maxSingleTransactionUsd);
  const autonomous = micros(input.maxAutonomousTransactionUsd);
  const concentration = basisPoints(input.maxAssetConcentrationPercent);
  const reserve = basisPoints(input.minimumLiquidStableReservePercent);
  if (
    single === null ||
    single <= 0n ||
    autonomous === null ||
    concentration === null ||
    reserve === null
  )
    return NextResponse.json({ error: 'Check the policy limits.' }, { status: 400 });
  const result = await new SolanaPolicyContext(input.cluster).save(policyService(), wallet, {
    allowedAssetIds: input.allowedSol ? ['sol'] : [],
    excludedAssetIds: [],
    allowedProtocolIds: ['solana-native'],
    maxSingleTransactionValue: usd(single),
    maxAssetConcentrationBps: concentration,
    minimumLiquidStableReserveBps: reserve,
    autonomy: { enabled: input.autonomyEnabled, maxTransactionValue: usd(autonomous) },
  });
  if (!result.policy) {
    return NextResponse.json(
      {
        error: Object.values(result.errors)[0] ?? 'Policy could not be saved.',
        errors: result.errors,
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ policy: serialize(result.policy) });
}
