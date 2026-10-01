import type { SolanaOpportunity } from '@/domain';
import type { SolanaCluster } from './solana-config';

export const jitoSolOpportunityId = 'jito-sol-liquid-staking';

const jitoSolDevnet = {
  stakePoolProgram: 'DPoo15wWDqpPJJtS2MUZ49aRxqz5ZaaJCJP4z8bLuib',
  stakePool: 'JitoY5pcAxWX6iyP2QdFwTznGb8A99PRCUCVVxB46WZ',
  mint: 'J1tos8mqbhdGcF3pgj4PCKyVjzWSURcpLZU7pPGHxSYi',
  decimals: 9,
} as const;

export type JitoSolDeployment = typeof jitoSolDevnet;

/**
 * The current Jito-supported Devnet stake pool deployment. Localnet intentionally
 * has no Jito entry: its addresses cannot be safely treated as a local deployment.
 */
export function jitoSolDeployment(cluster: SolanaCluster): JitoSolDeployment | null {
  return cluster === 'devnet' ? jitoSolDevnet : null;
}

export function jitoSolOpportunity(cluster: SolanaCluster): SolanaOpportunity | null {
  if (!jitoSolDeployment(cluster)) return null;
  return {
    id: jitoSolOpportunityId,
    protocol: 'Jito',
    name: 'JitoSOL Liquid Staking',
    asset: 'SOL',
    category: 'STAKING',
    riskLevel: 'BALANCED',
    liquidity: 'LIQUID',
    leverage: false,
    description:
      'Stake SOL and receive JitoSOL, a liquid staking token that represents staked SOL while remaining usable on-chain.',
    whyItExists: 'A supported liquid-staking path for SOL on Solana Devnet.',
    enabled: true,
    isDevelopmentFixture: false,
  };
}
