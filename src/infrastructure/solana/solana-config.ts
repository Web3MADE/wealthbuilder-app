export const solanaClusters = ['devnet', 'localnet'] as const;

export type SolanaCluster = (typeof solanaClusters)[number];

export type SolanaRpcUrls = Readonly<{
  rpcUrl: string;
  rpcSubscriptionsUrl: string;
}>;

type PublicEnvironment = Readonly<Record<string, string | undefined>>;

const defaultRpcUrls: Readonly<Record<SolanaCluster, SolanaRpcUrls>> = {
  devnet: {
    rpcUrl: 'https://api.devnet.solana.com',
    rpcSubscriptionsUrl: 'wss://api.devnet.solana.com',
  },
  localnet: {
    rpcUrl: 'http://127.0.0.1:8899',
    rpcSubscriptionsUrl: 'ws://127.0.0.1:8900',
  },
};

const walletChains: Readonly<Record<SolanaCluster, `solana:${string}`>> = {
  devnet: 'solana:devnet',
  // Wallet Standard wallets generally do not advertise a localnet chain. Keep
  // discovery compatible with devnet while directing RPC reads to localnet.
  localnet: 'solana:devnet',
};

export function solanaClusterFromEnvironment(
  source: PublicEnvironment = process.env,
): SolanaCluster {
  return source.NEXT_PUBLIC_SOLANA_CLUSTER === 'localnet' ? 'localnet' : 'devnet';
}

export function solanaRpcUrls(
  cluster: SolanaCluster,
  source: PublicEnvironment = process.env,
): SolanaRpcUrls {
  const defaults = defaultRpcUrls[cluster];
  if (cluster === 'localnet') {
    return {
      rpcUrl: source.NEXT_PUBLIC_SOLANA_LOCALNET_RPC_URL ?? defaults.rpcUrl,
      rpcSubscriptionsUrl:
        source.NEXT_PUBLIC_SOLANA_LOCALNET_RPC_SUBSCRIPTIONS_URL ?? defaults.rpcSubscriptionsUrl,
    };
  }
  return {
    rpcUrl: source.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL ?? defaults.rpcUrl,
    rpcSubscriptionsUrl:
      source.NEXT_PUBLIC_SOLANA_DEVNET_RPC_SUBSCRIPTIONS_URL ?? defaults.rpcSubscriptionsUrl,
  };
}

export function solanaWalletChain(cluster: SolanaCluster): `solana:${string}` {
  return walletChains[cluster];
}
