import type {
  SolanaOpportunity,
  SolanaOpportunityLiquidity,
  SolanaOpportunityMatch,
  SolanaOpportunityRiskLevel,
  PlanAllocation,
  PlanSuitability,
  RuledOutStrategy,
  SolanaPortfolioComposition,
  SolanaStrategyPreferences,
} from './index';
import type { PersonalWealthProfile } from '../wealth-profile/index';

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
    `This example allocation uses up to ${allocationPercent}% of your ${opportunity.asset === 'SOL' ? 'SOL' : 'stablecoin'} holdings.`,
  ];
}

/**
 * Transparent rules-based selection for the MVP. This never estimates returns,
 * allocates all assets, or recommends leveraged opportunities.
 */
export function matchSolanaOpportunities(
  input: Readonly<{
    preferences: SolanaStrategyPreferences;
    solBalanceLamports: bigint;
    portfolioComposition?: SolanaPortfolioComposition;
    planSuitability?: PlanSuitability;
    wealthProfile?: PersonalWealthProfile;
    opportunities: readonly SolanaOpportunity[];
  }>,
): SolanaOpportunityMatch {
  if (input.planSuitability) return matchPlanOpportunities(input, input.planSuitability);
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
        !opportunity.leverage &&
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

function matchPlanOpportunities(
  input: Readonly<{
    preferences: SolanaStrategyPreferences;
    solBalanceLamports: bigint;
    portfolioComposition?: SolanaPortfolioComposition;
    wealthProfile?: PersonalWealthProfile;
    opportunities: readonly SolanaOpportunity[];
  }>,
  suitability: PlanSuitability,
): SolanaOpportunityMatch {
  const composition = input.portfolioComposition ?? {
    availableAssets: input.solBalanceLamports > 0n ? (['SOL'] as const) : [],
    preferredAsset: 'SOL' as const,
  };
  if (composition.availableAssets.length === 0)
    return {
      selectedOpportunity: null,
      eligibleOpportunities: [],
      allocationPercent: null,
      reasons: ['No supported SOL or stablecoin holding is available in this public snapshot.'],
      ruledOut: input.opportunities.map((opportunity) => ({
        strategy: opportunity.name,
        reason: 'This wallet snapshot does not show the asset needed for this strategy.',
      })),
    };

  const eligibility = input.opportunities.map((opportunity) => ({
    opportunity,
    reason: planExclusionReason(opportunity, suitability, composition),
  }));
  const eligibleOpportunities = eligibility
    .filter(({ opportunity, reason }) => opportunity.enabled && reason === null)
    .map(({ opportunity }) => opportunity)
    .sort(
      (left, right) =>
        planScore(right, suitability, composition) - planScore(left, suitability, composition),
    );
  const selectedOpportunity = eligibleOpportunities[0] ?? null;
  const ruledOut: readonly RuledOutStrategy[] = eligibility
    .filter(({ opportunity }) => opportunity.id !== selectedOpportunity?.id)
    .map(({ opportunity, reason }) => ({
      strategy: opportunity.name,
      reason:
        reason ??
        `${selectedOpportunity?.name ?? 'The selected strategy'} better matches your stated goal, timeline, and comfort with volatility.`,
    }));

  if (!selectedOpportunity)
    return {
      selectedOpportunity: null,
      eligibleOpportunities,
      allocationPercent: null,
      reasons: [
        'No configured strategy is currently aligned with these answers and visible holdings.',
      ],
      ruledOut,
    };

  const allocation = planAllocation(
    selectedOpportunity,
    suitability,
    input.wealthProfile,
    composition,
  );
  return {
    selectedOpportunity,
    eligibleOpportunities,
    allocationPercent: allocation[0]!.percent,
    allocation,
    ruledOut,
    reasons: planReasons(selectedOpportunity, suitability, allocation),
  };
}

function planExclusionReason(
  opportunity: SolanaOpportunity,
  suitability: PlanSuitability,
  composition: SolanaPortfolioComposition,
): string | null {
  if (!opportunity.enabled) return 'This strategy is not currently available.';
  if (!composition.availableAssets.includes(opportunity.asset))
    return `This public snapshot does not show ${opportunity.asset === 'SOL' ? 'SOL' : 'supported stablecoins'} for this strategy.`;
  if (!opportunity.leverage) return null;
  if (suitability.timeHorizon === 'within-1-year' || suitability.timeHorizon === '1-3-years')
    return 'Your shorter timeframe makes borrowing and liquidation exposure a poor fit.';
  if (suitability.dropBehavior === 'sell')
    return 'Selling during large drops signals a lower tolerance for leverage and liquidation exposure.';
  if (suitability.dropBehavior !== 'buy-more')
    return 'This higher-risk strategy requires an explicit comfort with volatility and drawdowns.';
  if (suitability.goal !== 'grow')
    return 'This higher-risk strategy is reserved for a growth-oriented goal.';
  return null;
}

function planScore(
  opportunity: SolanaOpportunity,
  suitability: PlanSuitability,
  composition: SolanaPortfolioComposition,
): number {
  let score = opportunity.asset === composition.preferredAsset ? 100 : 0;
  if (opportunity.category === 'LENDING') {
    if (suitability.timeHorizon === 'within-1-year') score += 35;
    if (suitability.dropBehavior === 'sell') score += 30;
    if (suitability.goal === 'safer' || suitability.goal === 'freedom') score += 20;
    if (suitability.goal === 'income') score += 15;
  }
  if (opportunity.category === 'STAKING') {
    if (suitability.dropBehavior === 'hold') score += 35;
    if (suitability.timeHorizon === '3-5-years' || suitability.timeHorizon === '5-plus-years')
      score += 25;
    if (suitability.goal === 'grow' || suitability.goal === 'income') score += 20;
    if (suitability.goal === 'freedom') score += 10;
  }
  if (opportunity.leverage) score += 50;
  return score;
}

function planAllocation(
  opportunity: SolanaOpportunity,
  suitability: PlanSuitability,
  profile: PersonalWealthProfile | undefined,
  composition: SolanaPortfolioComposition,
): readonly PlanAllocation[] {
  if (opportunity.category === 'LENDING') {
    const [lending, reserve] = stablecoinAllocation(suitability, profile);
    return [
      { label: 'Stablecoin lending', asset: 'STABLECOIN', percent: lending, status: 'held' },
      {
        label: 'Liquid stablecoin reserve',
        asset: 'STABLECOIN',
        percent: reserve,
        status: 'held',
      },
    ];
  }
  if (opportunity.leverage) {
    const [yieldAllocation, reserve] = leveragedAllocation(suitability, profile);
    return [
      { label: 'Higher-risk yield', asset: 'SOL', percent: yieldAllocation, status: 'held' },
      { label: 'Unleveraged SOL reserve', asset: 'SOL', percent: reserve, status: 'held' },
    ];
  }

  const [staking, reserve] = stakingAllocation(suitability, profile);
  const stablecoinsAreVisible = composition.availableAssets.includes('STABLECOIN');
  return [
    { label: 'SOL staking', asset: 'SOL', percent: staking, status: 'held' },
    {
      label: stablecoinsAreVisible
        ? 'Liquid stablecoin reserve'
        : 'Liquid stablecoin reserve target',
      asset: stablecoinsAreVisible ? 'STABLECOIN' : 'USDC',
      percent: reserve,
      status: stablecoinsAreVisible ? 'held' : 'target',
    },
  ];
}

function stakingAllocation(
  suitability: PlanSuitability,
  profile: PersonalWealthProfile | undefined,
): readonly [number, number] {
  if (profile?.reservePriority === 'high' || profile?.liquidityNeed === 'high') return [40, 60];
  if (profile?.reservePriority === 'medium' || profile?.liquidityNeed === 'medium') return [55, 45];
  if (
    suitability.goal === 'grow' &&
    suitability.timeHorizon === '5-plus-years' &&
    suitability.dropBehavior === 'hold' &&
    profile?.reservePriority === 'low' &&
    profile.liquidityNeed === 'low'
  )
    return [80, 20];
  return [70, 30];
}

function stablecoinAllocation(
  suitability: PlanSuitability,
  profile: PersonalWealthProfile | undefined,
): readonly [number, number] {
  if (profile?.reservePriority === 'high' || profile?.liquidityNeed === 'high') return [30, 70];
  if (profile?.reservePriority === 'medium' || profile?.liquidityNeed === 'medium') return [50, 50];
  if (
    suitability.goal === 'income' &&
    (suitability.timeHorizon === '3-5-years' || suitability.timeHorizon === '5-plus-years') &&
    profile?.reservePriority === 'low' &&
    profile.liquidityNeed === 'low'
  )
    return [70, 30];
  return [60, 40];
}

function leveragedAllocation(
  suitability: PlanSuitability,
  profile: PersonalWealthProfile | undefined,
): readonly [number, number] {
  if (
    suitability.goal === 'grow' &&
    suitability.timeHorizon === '5-plus-years' &&
    suitability.dropBehavior === 'buy-more' &&
    profile?.reservePriority === 'low' &&
    profile.liquidityNeed === 'low'
  )
    return [30, 70];
  return [20, 80];
}

function planReasons(
  opportunity: SolanaOpportunity,
  suitability: PlanSuitability,
  allocation: readonly PlanAllocation[],
): readonly string[] {
  const reserve = allocation[allocation.length - 1]!;
  const behaviourReason =
    suitability.dropBehavior === 'hold'
      ? 'Your preference to hold through volatility supports a longer-term productive use of crypto.'
      : suitability.dropBehavior === 'sell'
        ? 'Your preference to reduce risk during drawdowns favours a simpler, liquid option.'
        : suitability.dropBehavior === 'buy-more'
          ? 'Your comfort buying during drawdowns supports a higher-volatility profile when the rest of your answers agree.'
          : 'Your answers keep the plan focused on flexibility instead of assuming aggressive risk tolerance.';
  return [
    `${opportunity.name} matches the assets visible in your public wallet snapshot.`,
    behaviourReason,
    reserve.status === 'target'
      ? `This example allocation sets ${reserve.percent}% aside as a reserve target; it is not a detected holding.`
      : `This example allocation keeps ${reserve.percent}% in a reserve rather than allocating everything to one strategy.`,
  ];
}
