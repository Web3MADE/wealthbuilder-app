'use client';

import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useIsWalletReady,
  useSignMessage,
  useWallets,
} from '@solana/kit-plugin-wallet/react';
import { useCallback } from 'react';
import { solanaWalletChain } from './solana-config';
import { useSolanaClient, useSolanaCluster } from './solana-provider';

export type SolanaWalletConnection = Readonly<{
  address: string | null;
  cluster: string;
  isReady: boolean;
  canSignTransactions: boolean;
  networkReady: boolean;
  wallets: readonly Readonly<{ name: string; icon?: string }>[];
  connect: (walletName: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<Uint8Array>;
}>;

export function useSolanaWallet(): SolanaWalletConnection {
  const client = useSolanaClient();
  const { cluster } = useSolanaCluster();
  const wallets = useWallets(client);
  const connectedWallet = useConnectedWallet(client);
  const isReady = useIsWalletReady(client);
  const { dispatchAsync: connectWallet } = useConnect(client);
  const { dispatchAsync: disconnectWallet } = useDisconnect(client);
  const { dispatchAsync: signWalletMessage } = useSignMessage(client);
  const connectedAddress = connectedWallet?.account.address ?? null;

  const connect = useCallback(
    async (walletName: string) => {
      const wallet = wallets.find((candidate) => candidate.name === walletName);
      if (!wallet) throw new Error('The selected Solana wallet is no longer available.');
      await connectWallet(wallet);
    },
    [connectWallet, wallets],
  );

  return {
    address: connectedAddress,
    cluster,
    isReady,
    canSignTransactions: connectedWallet?.signer !== null && connectedWallet?.signer !== undefined,
    networkReady:
      !connectedWallet || connectedWallet.wallet.chains.includes(solanaWalletChain(cluster)),
    wallets: wallets.map((wallet) => ({ name: wallet.name, icon: wallet.icon })),
    connect,
    disconnect: async () => disconnectWallet(),
    signMessage: async (message) => signWalletMessage(new TextEncoder().encode(message)),
  };
}
