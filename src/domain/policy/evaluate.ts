import { multiplyPrice } from '../money/index';
import type { ProposedAction } from '../actions/index';
import type { PersonalWealthPolicy, PolicyDecision, PolicyViolation } from './index';
import { portfolioValue, type Portfolio, type PriceQuote } from '../portfolio/index';

export type PolicyEvaluationContext = Readonly<{
  now: Date;
  portfolio: Portfolio;
  quotes: readonly PriceQuote[];
}>;

export function evaluatePolicy(
  policy: PersonalWealthPolicy,
  action: ProposedAction,
  context: PolicyEvaluationContext,
): PolicyDecision {
  const violations: PolicyViolation[] = [];
  const quote = context.quotes.find((candidate) => candidate.assetId === action.asset.id);
  if (!quote || quote.expiresAt <= context.now)
    violations.push({ code: 'PRICE_UNAVAILABLE', details: { assetId: action.asset.id } });
  if (!policy.allowedAssetIds.includes(action.asset.id))
    violations.push({
      code: 'ASSET_NOT_ALLOWED',
      details: { assetId: action.asset.id },
    });
  if (policy.excludedAssetIds.includes(action.asset.id))
    violations.push({
      code: 'ASSET_EXCLUDED',
      details: { assetId: action.asset.id },
    });
  if (!policy.allowedProtocolIds.includes(action.protocolId))
    violations.push({
      code: 'PROTOCOL_NOT_ALLOWED',
      details: { protocolId: action.protocolId },
    });

  const actionValue = quote
    ? multiplyPrice(action.amount, quote.priceMicrosPerUnit)
    : { currency: 'USD' as const, micros: 0n };
  if (actionValue.micros > policy.maxSingleTransactionValue.micros)
    violations.push({
      code: 'TRANSACTION_LIMIT_EXCEEDED',
      details: {
        actionValueMicros: actionValue.micros.toString(),
        maximumMicros: policy.maxSingleTransactionValue.micros.toString(),
      },
    });
  const totalValue = portfolioValue(context.portfolio).micros;
  const postActionPortfolioValue = totalValue + actionValue.micros;
  const postActionAssetValue =
    context.portfolio.positions
      .filter((position) => position.asset.id === action.asset.id)
      .reduce((total, position) => total + position.value.micros, 0n) + actionValue.micros;
  const concentrationBps =
    postActionPortfolioValue === 0n
      ? 0n
      : (postActionAssetValue * 10_000n) / postActionPortfolioValue;
  if (concentrationBps > BigInt(policy.maxAssetConcentrationBps))
    violations.push({
      code: 'ASSET_CONCENTRATION_EXCEEDED',
      details: {
        assetId: action.asset.id,
        concentrationBps: concentrationBps.toString(),
        maximumBps: policy.maxAssetConcentrationBps.toString(),
      },
    });
  const liquidStableAfter = context.portfolio.positions
    .filter((position) => position.location === 'WALLET' && position.asset.isStablecoin)
    .reduce(
      (total, position) =>
        total +
        position.value.micros -
        (position.asset.id === action.asset.id ? actionValue.micros : 0n),
      0n,
    );
  const stableReserveBps =
    postActionPortfolioValue === 0n ? 0n : (liquidStableAfter * 10_000n) / postActionPortfolioValue;
  if (
    postActionPortfolioValue > 0n &&
    stableReserveBps < BigInt(policy.minimumLiquidStableReserveBps)
  )
    violations.push({
      code: 'LIQUIDITY_RESERVE_BREACHED',
      details: {
        reserveBps: stableReserveBps.toString(),
        minimumBps: policy.minimumLiquidStableReserveBps.toString(),
      },
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
                details: {
                  actionValueMicros: actionValue.micros.toString(),
                  maximumMicros: policy.autonomy.maxTransactionValue.micros.toString(),
                },
              },
            ]
          : [],
      evaluatedAt: context.now,
    };
  return { outcome: 'AUTONOMOUS_ALLOWED', actionValue, violations: [], evaluatedAt: context.now };
}
