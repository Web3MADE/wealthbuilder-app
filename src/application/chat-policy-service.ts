import {
  atomic,
  validatePolicySettings,
  type ActionPlan,
  type AssetRef,
  type PersonalWealthPolicy,
  type PolicyDecision,
  type PolicySettings,
  type ProposedAction,
} from '@/domain';
import type { AIChatContext, PolicyChangeProposal } from './interfaces/ai-chat';
import type { ChatContextPort } from './interfaces/chat-context';
import { PolicyService } from './policy-service';

export type ChatActionEvaluation = Readonly<{
  actionIndex: number;
  action: ProposedAction;
  decision: PolicyDecision;
}>;

function decimalToAtomic(value: string, decimals: number) {
  const [whole = '0', fraction = ''] = value.split('.');
  return atomic(
    BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0')),
    decimals,
  );
}

function assetFor(actionAssetId: string, supportedAssets: readonly AssetRef[]): AssetRef {
  const known = supportedAssets.find((asset) => asset.id === actionAssetId);
  if (known) return known;
  // An unknown asset is still represented as a domain proposal so the deterministic
  // evaluator can block it for missing price and policy allow-list violations.
  return {
    id: actionAssetId,
    symbol: actionAssetId.toUpperCase().slice(0, 12),
    decimals: 6,
    isStablecoin: false,
  };
}

function toProposedAction(
  plan: ActionPlan,
  actionIndex: number,
  context: AIChatContext,
  now: Date,
): ProposedAction {
  const planned = plan.proposedActions[actionIndex]!;
  const asset = assetFor(planned.asset, context.supportedAssets);
  return {
    id: crypto.randomUUID(),
    type: 'SUPPLY',
    walletId: context.portfolio.walletId,
    chain: context.portfolio.chain,
    asset,
    amount: decimalToAtomic(planned.amount, asset.decimals),
    protocolId: planned.protocol,
    protocolType: 'LENDING',
    policyVersion: context.policy.version,
    portfolioId: context.portfolio.id,
    createdAt: now,
    expiresAt: context.portfolio.expiresAt,
  };
}

export function evaluateChatPlan(
  policyService: PolicyService,
  context: AIChatContext,
  plan: ActionPlan,
  now = new Date(),
): readonly ChatActionEvaluation[] {
  return plan.proposedActions.map((_, actionIndex) => {
    const action = toProposedAction(plan, actionIndex, context, now);
    return {
      actionIndex,
      action,
      decision: policyService.evaluateAction(context.policy, action, {
        now,
        portfolio: context.portfolio,
        quotes: context.quotes,
      }),
    };
  });
}

export async function applyChatPolicyChange(
  store: ChatContextPort,
  context: AIChatContext,
  proposal: PolicyChangeProposal,
): Promise<PersonalWealthPolicy> {
  const settings: PolicySettings = {
    allowedAssetIds: context.policy.allowedAssetIds,
    excludedAssetIds: context.policy.excludedAssetIds,
    allowedProtocolIds: context.policy.allowedProtocolIds,
    maxSingleTransactionValue: context.policy.maxSingleTransactionValue,
    maxAssetConcentrationBps: context.policy.maxAssetConcentrationBps,
    minimumLiquidStableReserveBps: proposal.minimumLiquidStableReserveBps,
    autonomy: context.policy.autonomy,
  };
  const errors = validatePolicySettings(settings);
  if (Object.keys(errors).length) throw new Error('The proposed policy update is invalid.');
  return store.savePolicy(settings);
}

export function policyReservePercent(policy: PersonalWealthPolicy): number {
  return policy.minimumLiquidStableReserveBps / 100;
}

export function policyDecisionAmountUsd(decision: PolicyDecision): string {
  const micros = decision.actionValue.micros;
  return `${micros / 1_000_000n}.${(micros % 1_000_000n).toString().padStart(6, '0')}`;
}
