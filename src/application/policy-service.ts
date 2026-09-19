import type { PersonalWealthPolicy } from '@/domain';
import type { AuditRepositoryPort, PolicyRepositoryPort } from './interfaces/repositories';
export class PolicyService {
  constructor(
    private readonly policies: PolicyRepositoryPort,
    private readonly audit: AuditRepositoryPort,
  ) { }
  async save(policy: PersonalWealthPolicy): Promise<void> {
    await this.policies.save(policy);
    await this.audit.append({
      id: crypto.randomUUID(),
      walletId: policy.walletId,
      type: 'PolicyCreated',
      actor: 'USER',
      occurredAt: new Date(),
      metadata: { version: String(policy.version) },
    });
  }
}
