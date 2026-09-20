import {
  validatePolicySettings,
  type ChainRef,
  type PolicySettings,
  type WalletId,
} from '@/domain';
import type { PolicyRepositoryPort } from './interfaces/repositories';
export class PolicyService {
  constructor(private readonly policies: PolicyRepositoryPort) {}

  async load(walletId: WalletId, chain: ChainRef) {
    return this.policies.getActive(walletId, chain);
  }

  async save(walletId: WalletId, chain: ChainRef, settings: PolicySettings) {
    const errors = validatePolicySettings(settings);
    if (Object.keys(errors).length > 0) return { policy: null, errors };
    const policy = await this.policies.saveNext(walletId, chain, settings);
    return { policy, errors: {} };
  }
}
