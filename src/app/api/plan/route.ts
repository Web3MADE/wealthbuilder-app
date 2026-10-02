import { address } from '@solana/kit';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SolanaStrategyService } from '@/application/solana-strategy-service';
import {
  solanaStrategyGoals,
  solanaStrategyRisks,
  solanaStrategyTimelines,
  type SolanaPortfolioComposition,
} from '@/domain';
import {
  AIProviderConfigurationError,
  resolveSolanaMatchExplainer,
} from '@/infrastructure/ai/ai-model-catalog';
import {
  OpendexPortfolioError,
  fetchOpendexSolanaPortfolio,
} from '@/infrastructure/solana/opendex-solana-portfolio';
import { PublicPlanSolanaOpportunityCatalogue } from '@/infrastructure/solana/plan-solana-opportunity-catalogue';
import {
  planExamplePortfolio,
  planExamplePresets,
} from '@/infrastructure/solana/plan-example-portfolios';

export const runtime = 'nodejs';

const planRequestSchema = z
  .object({
    source: z.enum(['wallet', 'example']),
    walletAddress: z.string().trim().min(32).max(64).optional(),
    examplePreset: z.enum(planExamplePresets).optional(),
    goal: z.enum(solanaStrategyGoals),
    timeline: z.enum(solanaStrategyTimelines),
    risk: z.enum(solanaStrategyRisks),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.source === 'wallet' && !value.walletAddress)
      context.addIssue({
        code: 'custom',
        message: 'Enter a Solana wallet address.',
        path: ['walletAddress'],
      });
    if (value.source === 'example' && !value.examplePreset)
      context.addIssue({
        code: 'custom',
        message: 'Choose an example portfolio.',
        path: ['examplePreset'],
      });
  });

export async function POST(request: Request) {
  const parsed = planRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Enter a valid Solana address and choose your goal, timeline, and risk level.' },
      { status: 400 },
    );

  try {
    const portfolio =
      parsed.data.source === 'wallet'
        ? await readWalletPortfolio(parsed.data.walletAddress!)
        : planExamplePortfolio(parsed.data.examplePreset!);
    const solBalanceLamports = solToLamports(portfolio.solBalance);
    const portfolioComposition = derivePortfolioComposition(portfolio, solBalanceLamports);
    let explainer = null;
    try {
      explainer = resolveSolanaMatchExplainer();
    } catch (error) {
      if (!(error instanceof AIProviderConfigurationError)) throw error;
    }
    const result = await new SolanaStrategyService(
      new PublicPlanSolanaOpportunityCatalogue(),
      explainer,
    ).find({
      preferences: {
        goal: parsed.data.goal,
        timeline: parsed.data.timeline,
        risk: parsed.data.risk,
      },
      solBalanceLamports,
      portfolioComposition,
    });
    const recommendation = result.recommendation;

    return NextResponse.json({
      portfolio,
      preferences: {
        goal: parsed.data.goal,
        timeline: parsed.data.timeline,
        risk: parsed.data.risk,
      },
      recommendation: recommendation
        ? {
            opportunity: recommendation.opportunity,
            allocationPercent: recommendation.allocationPercent,
            allocationAsset: recommendation.opportunity.asset,
            approximateSolAllocationLamports:
              recommendation.opportunity.asset === 'SOL'
                ? (
                    (solBalanceLamports * BigInt(recommendation.allocationPercent)) /
                    100n
                  ).toString()
                : null,
            deterministicReasons: recommendation.deterministicReasons,
            explanation: recommendation.explanation,
            explanationError: recommendation.explanationError,
          }
        : null,
      reasons: result.reasons,
      ruledOut:
        parsed.data.risk === 'growth'
          ? 'Leveraged strategies were excluded because WealthBuilder does not use leverage in this plan.'
          : `Leveraged strategies were excluded because you selected ${riskLabel(parsed.data.risk)} risk.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid Solana wallet address'))
      return NextResponse.json({ error: 'Enter a valid Solana wallet address.' }, { status: 400 });
    if (error instanceof OpendexPortfolioError)
      return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json(
      { error: 'We could not build this plan right now. Please try again.' },
      { status: 502 },
    );
  }
}

function derivePortfolioComposition(
  portfolio:
    Awaited<ReturnType<typeof readWalletPortfolio>> | ReturnType<typeof planExamplePortfolio>,
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
  const preferredAsset =
    hasStablecoins && (!hasSol || stablecoinUsdValue > (portfolio.solUsdValue ?? 0))
      ? 'STABLECOIN'
      : 'SOL';

  return {
    availableAssets: [
      ...(hasSol ? (['SOL'] as const) : []),
      ...(hasStablecoins ? (['STABLECOIN'] as const) : []),
    ],
    preferredAsset,
  };
}

async function readWalletPortfolio(walletAddress: string) {
  try {
    address(walletAddress);
  } catch {
    throw new Error('Invalid Solana wallet address');
  }
  return fetchOpendexSolanaPortfolio(walletAddress);
}

function solToLamports(sol: string) {
  const [whole = '', fraction = ''] = sol.split('.');
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) throw new Error('Invalid SOL balance');
  return BigInt(whole) * 1_000_000_000n + BigInt(`${fraction.slice(0, 9).padEnd(9, '0')}`);
}

function riskLabel(risk: (typeof solanaStrategyRisks)[number]) {
  return risk.slice(0, 1).toUpperCase() + risk.slice(1);
}
