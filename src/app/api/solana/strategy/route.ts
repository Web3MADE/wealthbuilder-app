import { NextResponse } from 'next/server';
import { SolanaStrategyService } from '@/application/solana-strategy-service';
import {
  AIProviderConfigurationError,
  resolveSolanaMatchExplainer,
} from '@/infrastructure/ai/ai-model-catalog';
import { ConfiguredSolanaOpportunityCatalogue } from '@/infrastructure/solana/solana-opportunity-catalogue';
import { solanaStrategyRequestSchema } from './strategy-request';

export const runtime = 'nodejs';

const maximumLamports = 18_446_744_073_709_551_615n;

export async function POST(request: Request) {
  const parsed = solanaStrategyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Choose a valid goal, timeline, risk level, and SOL balance.' },
      { status: 400 },
    );
  const solBalanceLamports = BigInt(parsed.data.solBalanceLamports);
  if (solBalanceLamports > maximumLamports)
    return NextResponse.json(
      { error: 'SOL balance is outside the supported range.' },
      { status: 400 },
    );

  let explainer = null;
  try {
    explainer = resolveSolanaMatchExplainer();
  } catch (error) {
    if (!(error instanceof AIProviderConfigurationError)) throw error;
  }
  const result = await new SolanaStrategyService(
    new ConfiguredSolanaOpportunityCatalogue(),
    explainer,
  ).find({
    preferences: {
      goal: parsed.data.goal,
      timeline: parsed.data.timeline,
      risk: parsed.data.risk,
    },
    solBalanceLamports,
  });
  return NextResponse.json(result);
}
