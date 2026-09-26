import { createClient, type Address, type Lamports } from '@solana/kit';
import { solanaRpc } from '@solana/kit-plugin-rpc';
import { walletSigner } from '@solana/kit-plugin-wallet';
import { solanaRpcUrls, solanaWalletChain, type SolanaCluster } from './solana-config';

export function createSolanaClient(cluster: SolanaCluster) {
  const urls = solanaRpcUrls(cluster);
  return createClient()
    .use(walletSigner({ chain: solanaWalletChain(cluster) }))
    .use(
      solanaRpc({
        rpcUrl: urls.rpcUrl,
        rpcSubscriptionsUrl: urls.rpcSubscriptionsUrl,
      }),
    );
}

export type SolanaClient = ReturnType<typeof createSolanaClient>;

export type SolanaBalanceRpc = Readonly<{
  getBalance(
    address: Address,
    config: Readonly<{ commitment: 'confirmed' }>,
  ): Readonly<{ send: () => Promise<Readonly<{ value: Lamports }>> }>;
}>;

export async function fetchSolBalance(
  rpc: SolanaBalanceRpc,
  walletAddress: Address,
): Promise<Lamports> {
  return (await rpc.getBalance(walletAddress, { commitment: 'confirmed' }).send()).value;
}
