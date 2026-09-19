import {
  multiplyPrice,
  portfolioValue,
  type PersonalWealthPolicy,
  type PolicyDecision,
  type PolicyViolation,
  type Portfolio,
  type PriceQuote,
  type ProposedAction,
  type RiskTier,
} from '../index';

export type PolicyEvaluationContext = Readonly<{
  now: Date;
  portfolio: Portfolio;
  quotes: readonly PriceQuote[];
  protocolRisk: RiskTier | null;
}>;
const riskOrder: Readonly<Record<RiskTier, number>> = {
  CONSERVATIVE: 0,
  MODERATE: 1,
  AGGRESSIVE: 2,
};

export function evaluatePolicy(
  policy: PersonalWealthPolicy,
  action: ProposedAction,
  context: PolicyEvaluationContext,
): PolicyDecision {
  const violations: PolicyViolation[] = [];
  const quote = context.quotes.find((candidate) => candidate.assetId === action.asset.id);
  if (context.portfolio.expiresAt <= context.now)
    violations.push({
      code: 'STALE_PORTFOLIO',
      message: 'Portfolio data has expired and cannot safely authorize execution.',
    });
  if (!quote || quote.expiresAt <= context.now)
    violations.push({ code: 'PRICE_UNAVAILABLE', message: 'A current trusted price is required.' });
  if (!policy.allowedAssetIds.includes(action.asset.id))
    violations.push({
      code: 'ASSET_NOT_ALLOWED',
      message: `${action.asset.symbol} is not allowed by this policy.`,
    });
  if (policy.excludedAssetIds.includes(action.asset.id))
    violations.push({
      code: 'ASSET_EXCLUDED',
      message: `${action.asset.symbol} is excluded by this policy.`,
    });
  if (!policy.allowedProtocolIds.includes(action.protocolId))
    violations.push({
      code: 'PROTOCOL_NOT_ALLOWED',
      message: `${action.protocolId} is not approved by this policy.`,
    });
  if (!context.protocolRisk || riskOrder[context.protocolRisk] > riskOrder[policy.riskTolerance])
    violations.push({
      code: 'PROTOCOL_NOT_ALLOWED',
      message: 'The protocol risk tier exceeds this policy.',
    });

  const actionValue = quote
    ? multiplyPrice(action.amount, quote.priceMicrosPerUnit)
    : { currency: 'USD' as const, micros: 0n };
  const walletAmount = context.portfolio.positions
    .filter((position) => position.location === 'WALLET' && position.asset.id === action.asset.id)
    .reduce((total, position) => total + position.amount.value, 0n);
  if (walletAmount < action.amount.value)
    violations.push({
      code: 'INSUFFICIENT_LIQUID_BALANCE',
      message: 'The wallet does not hold enough of this asset.',
    });
  if (actionValue.micros > policy.maxSingleTransactionValue.micros)
    violations.push({
      code: 'TRANSACTION_LIMIT_EXCEEDED',
      message: 'The action exceeds the transaction limit.',
    });
  const totalValue = portfolioValue(context.portfolio).micros;
  const stableAfter = context.portfolio.positions
    .filter((position) => position.location === 'WALLET' && position.asset.isStablecoin)
    .reduce(
      (total, position) =>
        total +
        position.value.micros -
        (position.asset.id === action.asset.id ? actionValue.micros : 0n),
      0n,
    );
  if (
    totalValue > 0n &&
    (stableAfter * 10_000n) / totalValue < BigInt(policy.minimumLiquidStableReserveBps)
  )
    violations.push({
      code: 'LIQUIDITY_RESERVE_BREACHED',
      message: 'The action breaches the liquid stablecoin reserve.',
    });
  if (violations.length > 0)
    return { outcome: 'BLOCKED', actionValue, violations, evaluatedAt: context.now };
  if (!policy.autonomy.enabled || actionValue.micros > policy.autonomy.maxTransactionValue.micros)
    return {
      outcome: 'REQUIRES_APPROVAL',
      actionValue,
      violations:
        actionValue.micros > policy.autonomy.maxTransactionValue.micros
          ? [
              {
                code: 'AUTONOMY_LIMIT_EXCEEDED',
                message: 'The action is allowed but requires approval.',
              },
            ]
          : [],
      evaluatedAt: context.now,
    };
  return { outcome: 'AUTONOMOUS_ALLOWED', actionValue, violations: [], evaluatedAt: context.now };
}
