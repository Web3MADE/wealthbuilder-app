import type { ActionPlan } from '@/domain';

type PlannedAction = ActionPlan['proposedActions'][number];

export function protocolName(protocol: string) {
  return protocol === 'aave-v3' ? 'Aave V3' : protocol;
}

export function actionTitle(action: PlannedAction) {
  return `${action.type === 'SUPPLY' ? 'Supply' : action.type} ${action.amount} ${action.asset.toUpperCase()} to ${protocolName(action.protocol)}`;
}

export function actionEffect(action: PlannedAction) {
  return action.type === 'SUPPLY' ? 'Wallet → supplied position' : 'Portfolio position updated';
}

export function policyReason(code: string) {
  const labels: Record<string, string> = {
    PRICE_UNAVAILABLE: 'We couldn’t verify a current price for this asset.',
    ASSET_NOT_ALLOWED: 'This asset is not included in your Wealth Policy.',
    ASSET_EXCLUDED: 'Your Wealth Policy excludes this asset.',
    PROTOCOL_NOT_ALLOWED: 'This destination is not approved by your Wealth Policy.',
    TRANSACTION_LIMIT_EXCEEDED: 'This amount is above your transaction limit.',
    ASSET_CONCENTRATION_EXCEEDED: 'This would put too much of your portfolio in one asset.',
    LIQUIDITY_RESERVE_BREACHED: 'This would take your liquid reserve below its limit.',
    AUTONOMY_LIMIT_EXCEEDED: 'This amount needs your approval before it can proceed.',
  };
  return labels[code] ?? 'This action does not meet your Wealth Policy.';
}

export function formatUsdcAmount(value: string) {
  return value.replace(/\s*USDC$/, '');
}
