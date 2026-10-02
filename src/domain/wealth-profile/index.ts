import type { PlanSuitability } from '../opportunities/index';

const stablecoinSymbols = new Set(['USDC', 'USDT', 'USDS', 'PYUSD', 'USDG']);

export type PersonalWealthProfile = Readonly<{
  objective: 'growth' | 'preservation' | 'income' | 'flexibility';
  horizon: 'short' | 'medium' | 'long' | 'very-long';
  drawdownPosture: 'reduce-risk' | 'hold-steady' | 'add-through-volatility' | 'uncertain';
  walletShape: 'sol-heavy' | 'stablecoin-heavy' | 'mixed' | 'unknown';
  walletShapeBasis: 'known-usd' | 'asset-presence' | 'partial-valuation';
  liquidityNeed: 'high' | 'medium' | 'low';
  volatilityTolerance: 'low' | 'medium' | 'high' | 'uncertain';
  reservePriority: 'high' | 'medium' | 'low';
}>;

export type PersonalWealthProfileLabels = Readonly<Record<keyof PersonalWealthProfile, string>>;

export type PublicWalletSnapshotInput = Readonly<{
  solBalance: string;
  solUsdValue: number | null;
  topTokenHoldings: readonly Readonly<{
    symbol: string;
    amount: string;
    usdValue: number | null;
  }>[];
  approximateTotalUsdValue: number | null;
  isPartial: boolean;
}>;

export type PublicWalletSnapshotFacts = Readonly<{
  solBalance: string;
  solUsdValue: number | null;
  visibleStablecoinUsdValue: number | null;
  approximateKnownSnapshotUsdValue: number | null;
  topVisibleHoldings: readonly Readonly<{
    symbol: string;
    amount: string;
    usdValue: number | null;
  }>[];
  isPartial: boolean;
  walletShapeBasis: PersonalWealthProfile['walletShapeBasis'];
}>;

/** Builds a conservative profile from stated preferences and a bounded public snapshot. */
export function createPersonalWealthProfile(
  suitability: PlanSuitability,
  snapshot: PublicWalletSnapshotInput,
): PersonalWealthProfile {
  const walletShape = walletShapeDecision(snapshot);
  return {
    objective: objectiveFor(suitability.goal),
    horizon: horizonFor(suitability.timeHorizon),
    drawdownPosture: drawdownPostureFor(suitability.dropBehavior),
    walletShape: walletShape.shape,
    walletShapeBasis: walletShape.basis,
    liquidityNeed: liquidityNeedFor(suitability),
    volatilityTolerance: volatilityToleranceFor(suitability.dropBehavior),
    reservePriority: reservePriorityFor(suitability),
  };
}

export function personalWealthProfileLabels(
  profile: PersonalWealthProfile,
): PersonalWealthProfileLabels {
  return {
    objective: {
      growth: 'Growth',
      preservation: 'Preservation',
      income: 'Income',
      flexibility: 'Flexibility',
    }[profile.objective],
    horizon: {
      short: 'Short term',
      medium: 'Medium term',
      long: 'Long term',
      'very-long': 'Very long term',
    }[profile.horizon],
    drawdownPosture: {
      'reduce-risk': 'Reduces risk during drops',
      'hold-steady': 'Holds through drops',
      'add-through-volatility': 'Adds through volatility',
      uncertain: 'Uncertain drawdown response',
    }[profile.drawdownPosture],
    walletShape: {
      'sol-heavy': 'SOL-heavy public snapshot',
      'stablecoin-heavy': 'Stablecoin-heavy public snapshot',
      mixed: 'Mixed public snapshot',
      unknown: 'Public snapshot shape unknown',
    }[profile.walletShape],
    walletShapeBasis: {
      'known-usd': 'Based on known USD values',
      'asset-presence': 'Based on detected asset presence',
      'partial-valuation': 'Some visible holdings lack USD values',
    }[profile.walletShapeBasis],
    liquidityNeed: {
      high: 'High liquidity need',
      medium: 'Medium liquidity need',
      low: 'Low liquidity need',
    }[profile.liquidityNeed],
    volatilityTolerance: {
      low: 'Low volatility tolerance',
      medium: 'Medium volatility tolerance',
      high: 'High volatility tolerance',
      uncertain: 'Uncertain volatility tolerance',
    }[profile.volatilityTolerance],
    reservePriority: {
      high: 'High reserve priority',
      medium: 'Medium reserve priority',
      low: 'Low reserve priority',
    }[profile.reservePriority],
  };
}

/** Reduces the public snapshot to the facts the explanatory model may use. */
export function publicWalletSnapshotFacts(
  snapshot: PublicWalletSnapshotInput,
): PublicWalletSnapshotFacts {
  const stablecoinValues = snapshot.topTokenHoldings
    .filter((holding) => stablecoinSymbols.has(holding.symbol.toUpperCase()))
    .map((holding) => usableUsdValue(holding.usdValue));
  const knownStablecoinValues = stablecoinValues.filter((value): value is number => value !== null);

  return {
    solBalance: snapshot.solBalance,
    solUsdValue: usableUsdValue(snapshot.solUsdValue),
    visibleStablecoinUsdValue: knownStablecoinValues.length ? sum(knownStablecoinValues) : null,
    approximateKnownSnapshotUsdValue: usableUsdValue(snapshot.approximateTotalUsdValue),
    topVisibleHoldings: snapshot.topTokenHoldings.map(({ symbol, amount, usdValue }) => ({
      symbol,
      amount,
      usdValue: usableUsdValue(usdValue),
    })),
    isPartial: snapshot.isPartial,
    walletShapeBasis: walletShapeDecision(snapshot).basis,
  };
}

function objectiveFor(goal: PlanSuitability['goal']): PersonalWealthProfile['objective'] {
  return (
    { grow: 'growth', safer: 'preservation', income: 'income', freedom: 'flexibility' } as const
  )[goal];
}

function horizonFor(timeHorizon: PlanSuitability['timeHorizon']): PersonalWealthProfile['horizon'] {
  return (
    {
      'within-1-year': 'short',
      '1-3-years': 'medium',
      '3-5-years': 'long',
      '5-plus-years': 'very-long',
    } as const
  )[timeHorizon];
}

function drawdownPostureFor(
  dropBehavior: PlanSuitability['dropBehavior'],
): PersonalWealthProfile['drawdownPosture'] {
  return (
    {
      sell: 'reduce-risk',
      hold: 'hold-steady',
      'buy-more': 'add-through-volatility',
      depends: 'uncertain',
    } as const
  )[dropBehavior];
}

function volatilityToleranceFor(
  dropBehavior: PlanSuitability['dropBehavior'],
): PersonalWealthProfile['volatilityTolerance'] {
  return ({ sell: 'low', hold: 'medium', 'buy-more': 'high', depends: 'uncertain' } as const)[
    dropBehavior
  ];
}

function walletShapeDecision(snapshot: PublicWalletSnapshotInput): Readonly<{
  shape: PersonalWealthProfile['walletShape'];
  basis: PersonalWealthProfile['walletShapeBasis'];
}> {
  const solUsdValue = usableUsdValue(snapshot.solUsdValue);
  const stablecoinUsdValue = sumKnownHoldings(snapshot, (holding) =>
    stablecoinSymbols.has(holding.symbol.toUpperCase()),
  );
  const otherTokenUsdValue = sumKnownHoldings(
    snapshot,
    (holding) => !stablecoinSymbols.has(holding.symbol.toUpperCase()),
  );
  const knownSnapshotUsdValue = [solUsdValue, stablecoinUsdValue, otherTokenUsdValue]
    .filter((value): value is number => value !== null)
    .reduce((total, value) => total + value, 0);

  const hasSol = positiveAmount(snapshot.solBalance);
  const hasStablecoins = snapshot.topTokenHoldings.some(
    (holding) =>
      stablecoinSymbols.has(holding.symbol.toUpperCase()) && positiveAmount(holding.amount),
  );
  const hasOtherTokens = snapshot.topTokenHoldings.some(
    (holding) =>
      !stablecoinSymbols.has(holding.symbol.toUpperCase()) && positiveAmount(holding.amount),
  );
  const hasMissingValuation =
    (hasSol && solUsdValue === null) ||
    snapshot.topTokenHoldings.some(
      (holding) => positiveAmount(holding.amount) && usableUsdValue(holding.usdValue) === null,
    );

  if (knownSnapshotUsdValue > 0) {
    const shape =
      (solUsdValue ?? 0) / knownSnapshotUsdValue >= 0.65
        ? 'sol-heavy'
        : (stablecoinUsdValue ?? 0) / knownSnapshotUsdValue >= 0.65
          ? 'stablecoin-heavy'
          : 'mixed';
    return { shape, basis: hasMissingValuation ? 'partial-valuation' : 'known-usd' };
  }

  if (hasSol && !hasStablecoins && !hasOtherTokens)
    return { shape: 'sol-heavy', basis: 'asset-presence' };
  if (hasStablecoins && !hasSol && !hasOtherTokens)
    return { shape: 'stablecoin-heavy', basis: 'asset-presence' };
  return { shape: 'unknown', basis: 'asset-presence' };
}

function liquidityNeedFor(suitability: PlanSuitability): PersonalWealthProfile['liquidityNeed'] {
  if (
    suitability.timeHorizon === 'within-1-year' ||
    (suitability.goal === 'freedom' && suitability.timeHorizon === '1-3-years')
  )
    return 'high';
  if (suitability.timeHorizon === '1-3-years' || suitability.goal === 'freedom') return 'medium';
  return 'low';
}

function reservePriorityFor(
  suitability: PlanSuitability,
): PersonalWealthProfile['reservePriority'] {
  if (
    suitability.timeHorizon === 'within-1-year' ||
    suitability.dropBehavior === 'sell' ||
    suitability.goal === 'safer'
  )
    return 'high';
  if (
    suitability.timeHorizon === '1-3-years' ||
    suitability.dropBehavior === 'depends' ||
    suitability.goal === 'freedom'
  )
    return 'medium';
  return 'low';
}

function sumKnownHoldings(
  snapshot: PublicWalletSnapshotInput,
  matches: (holding: PublicWalletSnapshotInput['topTokenHoldings'][number]) => boolean,
): number | null {
  const values = snapshot.topTokenHoldings
    .filter(matches)
    .map((holding) => usableUsdValue(holding.usdValue))
    .filter((value): value is number => value !== null);
  return values.length ? sum(values) : null;
}

function usableUsdValue(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value >= 0 ? value : null;
}

function positiveAmount(value: string): boolean {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
