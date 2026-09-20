import {
  evaluatePolicy,
  type PersonalWealthPolicy,
  type Portfolio,
  type ProposedAction,
  type PolicyDecision,
} from '@/domain';
import type { AuditRepositoryPort } from './interfaces/repositories';
import type { PriceProviderPort } from './interfaces/pricing';

export type EvaluateActionDependencies = Readonly<{
  prices: PriceProviderPort;
  audit: AuditRepositoryPort;
}>;

export async function evaluateAction(
  dependencies: EvaluateActionDependencies,
  input: Readonly<{
    policy: PersonalWealthPolicy;
    portfolio: Portfolio;
    action: ProposedAction;
    now: Date;
  }>,
): Promise<PolicyDecision> {
  const quotes = await dependencies.prices.getQuotes([input.action.asset]);
  const decision = evaluatePolicy(input.policy, input.action, {
    now: input.now,
    portfolio: input.portfolio,
    quotes,
  });
  await dependencies.audit.append({
    id: crypto.randomUUID(),
    walletId: input.policy.walletId,
    actionId: input.action.id,
    type: 'PolicyEvaluated',
    actor: 'SYSTEM',
    occurredAt: input.now,
    metadata: { outcome: decision.outcome, policyVersion: String(input.policy.version) },
  });
  return decision;
}
