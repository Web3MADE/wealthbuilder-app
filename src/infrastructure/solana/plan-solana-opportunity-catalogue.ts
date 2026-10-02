import type { SolanaOpportunity } from '@/domain';
import type { SolanaOpportunityRepositoryPort } from '@/application/interfaces/solana-opportunity-repository';

/**
 * Read-only strategy archetypes for the public plan. Only the Jito example is
 * backed by the separate Devnet execution demonstration; the others are advice only.
 */
const publicPlanOpportunities: readonly SolanaOpportunity[] = [
  {
    id: 'sol-liquid-staking',
    protocol: 'Jito',
    name: 'SOL liquid staking',
    asset: 'SOL',
    category: 'STAKING',
    riskLevel: 'BALANCED',
    liquidity: 'LIQUID',
    leverage: false,
    description: 'Put a portion of SOL to work while keeping a liquid token position.',
    whyItExists: 'A liquid, no-leverage strategy archetype for SOL holders.',
    enabled: true,
    isDevelopmentFixture: false,
  },
  {
    id: 'stablecoin-lending',
    protocol: 'Supported lending strategy',
    name: 'Stablecoin lending',
    asset: 'STABLECOIN',
    category: 'LENDING',
    riskLevel: 'BALANCED',
    liquidity: 'LIQUID',
    leverage: false,
    description: 'Lend a portion of stablecoins through a curated, liquid lending strategy.',
    whyItExists: 'A no-leverage strategy archetype for stablecoin holders.',
    enabled: true,
    isDevelopmentFixture: false,
  },
  {
    id: 'leveraged-yield',
    protocol: 'Strategy preview',
    name: 'Leveraged yield',
    asset: 'SOL',
    category: 'VAULT',
    riskLevel: 'GROWTH',
    liquidity: 'LIMITED',
    leverage: true,
    description: 'A higher-risk yield strategy that uses borrowing and has liquidation exposure.',
    whyItExists: 'A recommendation-only archetype for users who explicitly accept higher risk.',
    enabled: true,
    isDevelopmentFixture: false,
  },
];

export class PublicPlanSolanaOpportunityCatalogue implements SolanaOpportunityRepositoryPort {
  async listActive(): Promise<readonly SolanaOpportunity[]> {
    return publicPlanOpportunities;
  }
}
