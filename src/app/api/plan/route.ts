import { address } from '@solana/kit';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PlanSubmissionService } from '@/application/plan-submission-service';
import { SolanaStrategyService } from '@/application/solana-strategy-service';
import {
  planDropBehaviors,
  planGoals,
  planTimeHorizons,
  type PlanSuitability,
  type SolanaPortfolioComposition,
  type SolanaStrategyPreferences,
} from '@/domain';
import {
  AIProviderConfigurationError,
  resolveSolanaMatchExplainer,
} from '@/infrastructure/ai/ai-model-catalog';
import { DrizzlePlanSubmissionRepository } from '@/infrastructure/persistence/drizzle-plan-submission-repository';
import { createDatabase, type Database } from '@/infrastructure/persistence/postgres';
import {
  OpendexPortfolioError,
  fetchOpendexSolanaPortfolio,
  type PublicSolanaPortfolio,
} from '@/infrastructure/solana/opendex-solana-portfolio';
import {
  planExamplePortfolio,
  planExamplePresets,
} from '@/infrastructure/solana/plan-example-portfolios';
import { PublicPlanSolanaOpportunityCatalogue } from '@/infrastructure/solana/plan-solana-opportunity-catalogue';

export const runtime = 'nodejs';

const planRequestSchema = z
  .object({
    source: z.enum(['wallet', 'example']),
    walletAddress: z.string().trim().min(1).optional(),
    examplePreset: z.enum(planExamplePresets).optional(),
    goal: z.enum(planGoals),
    timeHorizon: z.enum(planTimeHorizons),
    dropBehavior: z.enum(planDropBehaviors),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.source === 'wallet' && !value.walletAddress)
      context.addIssue({
        code: 'custom',
        path: ['walletAddress'],
        message: 'Enter a Solana wallet.',
      });
    if (value.source === 'example' && !value.examplePreset)
      context.addIssue({ code: 'custom', path: ['examplePreset'], message: 'Choose an example.' });
  });

let database: Database | null = null;

function submissionService() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  database ??= createDatabase(url);
  return new PlanSubmissionService(new DrizzlePlanSubmissionRepository(database));
}

export async function POST(request: Request) {
  const parsed = planRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Choose a wallet or example and answer all three questions.' },
      { status: 400 },
    );

  const submissions = submissionService();
  if (!submissions)
    return NextResponse.json(
      { error: "We couldn't save your plan request. Please try again." },
      { status: 503 },
    );

  let submissionId: string;
  try {
    submissionId = await submissions.start({
      source: parsed.data.source,
      walletAddress: parsed.data.source === 'wallet' ? parsed.data.walletAddress! : null,
      examplePreset: parsed.data.source === 'example' ? parsed.data.examplePreset! : null,
      goal: parsed.data.goal,
      timeHorizon: parsed.data.timeHorizon,
      dropBehavior: parsed.data.dropBehavior,
    });
  } catch {
    return NextResponse.json(
      { error: "We couldn't save your plan request. Please try again." },
      { status: 503 },
    );
  }

  try {
    const portfolio =
      parsed.data.source === 'wallet'
        ? await readWalletPortfolio(parsed.data.walletAddress!)
        : planExamplePortfolio(parsed.data.examplePreset!);
    const solBalanceLamports = solToLamports(portfolio.solBalance);
    const portfolioComposition = derivePortfolioComposition(portfolio, solBalanceLamports);
    const suitability: PlanSuitability = {
      goal: parsed.data.goal,
      timeHorizon: parsed.data.timeHorizon,
      dropBehavior: parsed.data.dropBehavior,
    };
    const result = await new SolanaStrategyService(
      new PublicPlanSolanaOpportunityCatalogue(),
      resolveExplainer(),
    ).find({
      preferences: legacyPreferences(suitability),
      solBalanceLamports,
      portfolioComposition,
      planSuitability: suitability,
    });
    const recommendation = result.recommendation;
    const response = {
      portfolio,
      suitability,
      recommendation: recommendation
        ? {
            opportunity: recommendation.opportunity,
            allocation: recommendation.allocation,
            deterministicReasons: recommendation.deterministicReasons,
            explanation: recommendation.explanation,
          }
        : null,
      reasons: result.reasons,
      ruledOut: recommendation?.ruledOut ?? [],
    };

    await submissions.complete(submissionId, {
      portfolioSnapshot: portfolio,
      strategy: recommendation?.opportunity.id ?? null,
      allocation: recommendation?.allocation ?? null,
      deterministicReasons: result.reasons,
      ruledOut: response.ruledOut,
      aiExplanation: recommendation?.explanation ?? null,
    });
    return NextResponse.json(response);
  } catch (error) {
    const failure = failureMessage(error);
    await submissions.fail(submissionId, failure.storageError).catch(() => undefined);
    return NextResponse.json({ error: failure.userError }, { status: failure.status });
  }
}

function resolveExplainer() {
  try {
    return resolveSolanaMatchExplainer();
  } catch (error) {
    if (error instanceof AIProviderConfigurationError) return null;
    throw error;
  }
}

async function readWalletPortfolio(walletAddress: string) {
  try {
    address(walletAddress);
  } catch {
    throw new Error('invalid wallet');
  }
  // OpenDEX's SOL trader endpoints are used as the public Mainnet portfolio snapshot.
  return fetchOpendexSolanaPortfolio(walletAddress);
}

function derivePortfolioComposition(
  portfolio: PublicSolanaPortfolio,
  solBalanceLamports: bigint,
): SolanaPortfolioComposition {
  const stablecoinSymbols = new Set(['USDC', 'USDT', 'USDS', 'PYUSD', 'USDG']);
  const stablecoinHoldings = portfolio.topTokenHoldings.filter((holding) =>
    stablecoinSymbols.has(holding.symbol.toUpperCase()),
  );
  const hasSol = solBalanceLamports > 0n;
  const hasStablecoins = stablecoinHoldings.length > 0;
  const stablecoinUsdValue = stablecoinHoldings.reduce(
    (total, holding) => total + (holding.usdValue ?? 0),
    0,
  );
  return {
    availableAssets: [
      ...(hasSol ? (['SOL'] as const) : []),
      ...(hasStablecoins ? (['STABLECOIN'] as const) : []),
    ],
    preferredAsset:
      hasStablecoins && (!hasSol || stablecoinUsdValue > (portfolio.solUsdValue ?? 0))
        ? 'STABLECOIN'
        : 'SOL',
  };
}

function legacyPreferences(suitability: PlanSuitability): SolanaStrategyPreferences {
  return {
    goal:
      suitability.goal === 'safer' || suitability.goal === 'freedom'
        ? 'preserve-crypto'
        : suitability.goal === 'grow'
          ? 'long-term-wealth'
          : 'growth',
    timeline: suitability.timeHorizon === 'within-1-year' ? '1-3-years' : suitability.timeHorizon,
    risk:
      suitability.dropBehavior === 'sell'
        ? 'conservative'
        : suitability.dropBehavior === 'buy-more'
          ? 'growth'
          : 'balanced',
  };
}

function solToLamports(sol: string) {
  const [whole = '', fraction = ''] = sol.split('.');
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) throw new Error('invalid portfolio');
  return BigInt(whole) * 1_000_000_000n + BigInt(`${fraction.slice(0, 9).padEnd(9, '0')}`);
}

function failureMessage(error: unknown) {
  if (error instanceof Error && error.message === 'invalid wallet')
    return {
      status: 400,
      storageError: 'invalid wallet',
      userError: 'Enter a valid Solana wallet.',
    };
  if (error instanceof OpendexPortfolioError)
    return { status: 502, storageError: 'portfolio unavailable', userError: error.message };
  return {
    status: 502,
    storageError: 'plan generation failed',
    userError: 'We could not build your plan right now. Please try again.',
  };
}
