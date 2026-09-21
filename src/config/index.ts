import { z } from 'zod';
import type { ChainRef } from '@/domain';

export const avalancheFuji: ChainRef = { id: 'avalanche-fuji' };
export const fujiRpcUrl = 'https://api.avax-test.network/ext/bc/C/rpc';
export const fujiExplorerUrl = 'https://subnets-test.avax.network/c-chain';
export type ProtocolDeploymentConfig = Readonly<{
  id: string;
  chain: ChainRef;
  poolAddress: `0x${string}`;
  poolDataProviderAddress: `0x${string}`;
  assets: Readonly<Record<string, `0x${string}`>>;
  riskTier: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  version: string;
}>;
// Sourced from @bgd-labs/aave-address-book v4.44.22; update only with a reviewed configuration version bump.
export const aaveV3Fuji: ProtocolDeploymentConfig = {
  id: 'aave-v3',
  chain: avalancheFuji,
  poolAddress: '0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40',
  poolDataProviderAddress: '0xC65cbd1e309Bf0e841Ee6f6E786480598e6a4014',
  assets: { usdc: '0x5425890298aed601595a70AB815c96711a31Bc65' },
  riskTier: 'MODERATE',
  version: 'aave-address-book-4.44.22',
};
export const EnvironmentSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).default('gpt-4.1-mini'),
  FUJI_RPC_URL: z.string().url().default(fujiRpcUrl),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1).optional(),
  JAW_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_JAW_API_KEY: z.string().min(1).optional(),
  JAW_DELEGATE_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
  NEXT_PUBLIC_JAW_DELEGATE_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
});
export type Environment = z.infer<typeof EnvironmentSchema>;
export const parseEnvironment = (source: Record<string, string | undefined>): Environment =>
  EnvironmentSchema.parse(source);
