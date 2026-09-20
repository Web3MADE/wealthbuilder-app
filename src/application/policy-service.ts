import {
  evaluatePolicy,
  validatePolicySettings,
  type ChainRef,
  type PersonalWealthPolicy,
  type PolicyDecision,
  type PolicyEvaluationContext,
  type PolicySettings,
  type ProposedAction,
  type WalletId,
} from '@/domain';
import type { PolicyRepositoryPort } from './interfaces/repositories';
export class PolicyService {
  constructor(private readonly policies?: PolicyRepositoryPort) {}

  async load(walletId: WalletId, chain: ChainRef) {
    if (!this.policies) throw new Error('A policy repository is required to load policy state.');
    return this.policies.getActive(walletId, chain);
  }

  async save(walletId: WalletId, chain: ChainRef, settings: PolicySettings) {
    if (!this.policies) throw new Error('A policy repository is required to save policy state.');
    const errors = validatePolicySettings(settings);
    if (Object.keys(errors).length > 0) return { policy: null, errors };
    const policy = await this.policies.saveNext(walletId, chain, settings);
    return { policy, errors: {} };
  }

  /** The application entry point for deterministic decisions on proposed actions. */
  evaluateAction(
    policy: PersonalWealthPolicy,
    action: ProposedAction,
    context: PolicyEvaluationContext,
  ): PolicyDecision {
    return evaluatePolicy(policy, action, context);
  }
}
