import type { SolanaOpportunity } from '@/domain';
import type { SolanaOpportunityRepositoryPort } from '@/application/interfaces/solana-opportunity-repository';

/**
 * Add reviewed, real Solana opportunities here only after a product and execution
 * path have been selected. The Sunday MVP deliberately ships with no live entry.
 */
export const curatedSolanaOpportunities: readonly SolanaOpportunity[] = [];

/**
 * Explicitly non-live fixture for local UI/manual testing. It is excluded unless
 * SOLANA_ENABLE_DEVELOPMENT_OPPORTUNITY_FIXTURES=true in a development server.
 */
export const developmentSolanaOpportunityFixtures: readonly SolanaOpportunity[] = [
  {
    id: 'development-sol-staking-fixture',
    protocol: 'Development fixture',
    name: 'SOL opportunity preview',
    asset: 'SOL',
    category: 'STAKING',
    riskLevel: 'CONSERVATIVE',
    liquidity: 'LIQUID',
    leverage: false,
    description: 'A non-live fixture used to preview the WealthBuilder matching experience.',
    whyItExists: 'It exercises the recommendation UI before a real protocol is selected.',
    enabled: true,
    isDevelopmentFixture: true,
  },
];

export class ConfiguredSolanaOpportunityCatalogue implements SolanaOpportunityRepositoryPort {
  constructor(
    private readonly includeDevelopmentFixtures = process.env.NODE_ENV === 'development' &&
      process.env.SOLANA_ENABLE_DEVELOPMENT_OPPORTUNITY_FIXTURES === 'true',
  ) {}

  async listActive(): Promise<readonly SolanaOpportunity[]> {
    return [
      ...curatedSolanaOpportunities,
      ...(this.includeDevelopmentFixtures ? developmentSolanaOpportunityFixtures : []),
    ].filter((opportunity) => opportunity.enabled);
  }
}
