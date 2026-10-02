import type {
  SolanaOpportunity,
  SolanaOpportunityLiquidity,
  SolanaOpportunityMatch,
  SolanaOpportunityRiskLevel,
  SolanaPortfolioComposition,
  SolanaStrategyPreferences,
} from './index';

const riskRank: Readonly<Record<SolanaOpportunityRiskLevel, number>> = {
  CONSERVATIVE: 0,
  BALANCED: 1,
  GROWTH: 2,
};

const maximumOpportunityRisk: Readonly<
  Record<NonNullable<SolanaStrategyPreferences['risk']>, number>
> = {
  conservative: riskRank.CONSERVATIVE,
  balanced: riskRank.BALANCED,
  growth: riskRank.GROWTH,
};

const riskAllocationCap: Readonly<Record<NonNullable<SolanaStrategyPreferences['risk']>, number>> =
  {
    conservative: 10,
    balanced: 20,
    growth: 30,
  };

const timelineAllocationCap: Readonly<
  Record<NonNullable<SolanaStrategyPreferences['timeline']>, number>
> = {
  '1-3-years': 10,
  '3-5-years': 20,
  '5-plus-years': 30,
};

const goalAllocationCap: Readonly<Record<SolanaStrategyPreferences['goal'], number>> = {
  'preserve-crypto': 10,
  'long-term-wealth': 30,
  growth: 30,
};

function allowedLiquidity(
  timeline: NonNullable<SolanaStrategyPreferences['timeline']>,
): readonly SolanaOpportunityLiquidity[] {
  if (timeline === '1-3-years') return ['LIQUID'];
  if (timeline === '3-5-years') return ['LIQUID', 'LIMITED'];
  return ['LIQUID', 'LIMITED', 'LOCKED'];
}

function liquidityRank(liquidity: SolanaOpportunityLiquidity): number {
  return { LIQUID: 3, LIMITED: 2, LOCKED: 1 }[liquidity];
}

function goalScore(opportunity: SolanaOpportunity, preferences: SolanaStrategyPreferences): number {
  if (preferences.goal === 'preserve-crypto') {
    return liquidityRank(opportunity.liquidity) * 10 - riskRank[opportunity.riskLevel] * 4;
  }
  if (preferences.goal === 'growth')
    return riskRank[opportunity.riskLevel] * 10 + (opportunity.leverage ? 5 : 0);

  const categoryScore = { STAKING: 3, VAULT: 2, LENDING: 1 }[opportunity.category];
  const longTimelineBonus = preferences.timeline === '5-plus-years' ? 2 : 0;
  return categoryScore * 10 + longTimelineBonus + liquidityRank(opportunity.liquidity);
}

function compositionScore(
  opportunity: SolanaOpportunity,
  composition: SolanaPortfolioComposition,
): number {
  return opportunity.asset === composition.preferredAsset ? 100 : 0;
}

function matchingReasons(
  opportunity: SolanaOpportunity,
  preferences: SolanaStrategyPreferences,
  allocationPercent: number,
): readonly string[] {
  const timelineReason =
    preferences.timeline === '1-3-years'
      ? 'Your shorter timeline keeps the match to liquid opportunities.'
      : preferences.timeline === '3-5-years'
        ? 'Your timeline allows liquid or moderately flexible opportunities.'
        : 'Your longer timeline can include longer-term opportunity structures.';
  const goalReason =
    preferences.goal === 'preserve-crypto'
      ? 'Your preservation goal prioritises lower risk and easier access to funds.'
      : preferences.goal === 'growth'
        ? 'Your growth goal ranks the highest eligible risk tier first, without leverage.'
        : 'Your long-term wealth goal prioritises a sustainable, curated opportunity category.';
  return [
    `${opportunity.riskLevel.toLowerCase()} risk and ${opportunity.liquidity.toLowerCase()} liquidity fit your selected profile.`,
    timelineReason,
    goalReason,
    `The recommendation is capped at ${allocationPercent}% of your ${opportunity.asset === 'SOL' ? 'SOL' : 'stablecoin'} holdings.`,
  ];
}

/**
 * Transparent rules-based selection for the MVP. This never estimates returns,
 * allocates all assets, and only permits leverage for a Growth profile.
 */
export function matchSolanaOpportunities(
  input: Readonly<{
    preferences: SolanaStrategyPreferences;
    solBalanceLamports: bigint;
    portfolioComposition?: SolanaPortfolioComposition;
    opportunities: readonly SolanaOpportunity[];
  }>,
): SolanaOpportunityMatch {
  const { preferences, solBalanceLamports, opportunities } = input;
  const portfolioComposition = input.portfolioComposition ?? {
    availableAssets: solBalanceLamports > 0n ? (['SOL'] as const) : [],
    preferredAsset: 'SOL' as const,
  };
  if (!preferences.timeline || !preferences.risk)
    return {
      selectedOpportunity: null,
      eligibleOpportunities: [],
      reasons: ['Choose a timeline and risk level before finding a match.'],
      allocationPercent: null,
    };
  if (portfolioComposition.availableAssets.length === 0)
    return {
      selectedOpportunity: null,
      eligibleOpportunities: [],
      reasons: ['No supported SOL or stablecoin holding is currently available to allocate.'],
      allocationPercent: null,
    };

  const timeline = preferences.timeline;
  const risk = preferences.risk;
  const liquidity = allowedLiquidity(timeline);
  const eligibleOpportunities = opportunities
    .filter(
      (opportunity) =>
        opportunity.enabled &&
        portfolioComposition.availableAssets.includes(opportunity.asset) &&
        (!opportunity.leverage || risk === 'growth') &&
        riskRank[opportunity.riskLevel] <= maximumOpportunityRisk[risk] &&
        liquidity.includes(opportunity.liquidity),
    )
    .sort((left, right) => {
      const score =
        compositionScore(right, portfolioComposition) +
        goalScore(right, preferences) -
        compositionScore(left, portfolioComposition) -
        goalScore(left, preferences);
      return score || left.id.localeCompare(right.id);
    });
  const selectedOpportunity = eligibleOpportunities[0] ?? null;
  if (!selectedOpportunity)
    return {
      selectedOpportunity: null,
      eligibleOpportunities,
      reasons: [
        'No configured opportunity currently fits your risk, timeline, and no-leverage rules.',
      ],
      allocationPercent: null,
    };

  const allocationPercent = Math.min(
    riskAllocationCap[risk],
    timelineAllocationCap[timeline],
    goalAllocationCap[preferences.goal],
  );
  return {
    selectedOpportunity,
    eligibleOpportunities,
    allocationPercent,
    reasons: matchingReasons(selectedOpportunity, preferences, allocationPercent),
  };
}
