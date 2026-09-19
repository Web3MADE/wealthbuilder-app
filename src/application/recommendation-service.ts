import {
  evaluatePolicy,
  type PersonalWealthPolicy,
  type Portfolio,
  type ProposedAction,
  type PolicyDecision,
} from '@/domain';
import type { AuditRepositoryPort } from './ports/repositories';
import type { ProtocolRegistryPort } from './ports/protocol';
import type { PriceProviderPort } from './ports/pricing';

export type EvaluateActionDependencies = Readonly<{
  prices: PriceProviderPort;
  protocols: ProtocolRegistryPort;
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
  const protocol = dependencies.protocols.get(input.action.protocolId);
  const capabilities = protocol?.describeCapabilities() ?? [];
  const capability = capabilities.find(
    (candidate) =>
      candidate.chain.id === input.action.chain.id &&
      candidate.supportedAssetIds.includes(input.action.asset.id),
  );
  const quotes = await dependencies.prices.getQuotes([input.action.asset]);
  const decision = evaluatePolicy(input.policy, input.action, {
    now: input.now,
    portfolio: input.portfolio,
    quotes,
    protocolRisk: capability?.riskTier ?? null,
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
