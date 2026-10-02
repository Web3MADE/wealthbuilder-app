import type { SolanaOpportunity } from '@/domain';

export interface SolanaOpportunityRepositoryPort {
  listActive(): Promise<readonly SolanaOpportunity[]>;
}
