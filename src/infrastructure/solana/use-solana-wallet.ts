'use client';

import {
  address,
  compileTransaction,
  createNoopSigner,
  getBase64Decoder,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  type Base64EncodedWireTransaction,
  type Signature,
  type TransactionSigner,
} from '@solana/kit';
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useIsWalletReady,
  useSignMessage,
  useWallets,
} from '@solana/kit-plugin-wallet/react';
import { useCallback, useMemo } from 'react';
import type { JitoSolTransactionMessage } from './jito-sol-executor';
import { usePrivySolanaSession } from './privy-solana-provider';
import { solanaWalletChain } from './solana-config';
import { useSolanaClient, useSolanaCluster } from './solana-provider';

export type SolanaWalletSource = 'embedded' | 'external' | null;

export type SolanaJitoExecutionAdapter = Readonly<{
  payer: () => TransactionSigner;
  submitTransaction: (message: JitoSolTransactionMessage) => Promise<Signature>;
}>;

export type SolanaWalletConnection = Readonly<{
  address: string | null;
  cluster: string;
  isReady: boolean;
  canSignTransactions: boolean;
  networkReady: boolean;
  source: SolanaWalletSource;
  isPrivyConfigured: boolean;
  isPrivyAuthenticated: boolean;
  isEmbeddedWalletPending: boolean;
  walletSetupError: string | null;
  wallets: readonly Readonly<{ name: string; icon?: string }>[];
  startAuthentication: (method: 'google' | 'email') => void;
  retryWalletSetup: () => Promise<void>;
  connect: (walletName: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<Uint8Array>;
  jitoExecution: SolanaJitoExecutionAdapter | null;
}>;

/**
 * Presents either a Privy embedded wallet or a Wallet Standard wallet through
 * one application-facing connection. Portfolio and strategy code therefore
 * never needs to know where the user keeps their keys.
 */
export function useSolanaWallet(): SolanaWalletConnection {
  const client = useSolanaClient();
  const { cluster } = useSolanaCluster();
  const wallets = useWallets(client);
  const connectedWallet = useConnectedWallet(client);
  const isWalletStandardReady = useIsWalletReady(client);
  const { dispatchAsync: connectWallet } = useConnect(client);
  const { dispatchAsync: disconnectWallet } = useDisconnect(client);
  const { dispatchAsync: signWalletMessage } = useSignMessage(client);
  const privy = usePrivySolanaSession();
  const connectedAddress = connectedWallet?.account.address ?? null;
  const embeddedWallet = privy.wallet;
  const embeddedPayer = useMemo(
    () => (embeddedWallet ? createNoopSigner(address(embeddedWallet.address)) : null),
    [embeddedWallet],
  );
  const embeddedJitoExecution = useMemo<SolanaJitoExecutionAdapter | null>(() => {
    if (!embeddedWallet || !embeddedPayer) return null;
    return {
      payer: () => embeddedPayer,
      submitTransaction: async (message) => {
        const unsignedTransaction = getBase64Encoder().encode(
          getBase64EncodedWireTransaction(compileTransaction(message)),
        );
        const signedTransaction = await privy.signTransaction(Uint8Array.from(unsignedTransaction));
        return (await client.rpc
          .sendTransaction(
            getBase64Decoder().decode(signedTransaction) as Base64EncodedWireTransaction,
            { encoding: 'base64', preflightCommitment: 'confirmed' },
          )
          .send()) as Signature;
      },
    };
  }, [client.rpc, embeddedPayer, embeddedWallet, privy]);

  const connect = useCallback(
    async (walletName: string) => {
      const wallet = wallets.find((candidate) => candidate.name === walletName);
      if (!wallet) throw new Error('The selected Solana wallet is no longer available.');
      await connectWallet(wallet);
    },
    [connectWallet, wallets],
  );

  return {
    address: embeddedWallet?.address ?? connectedAddress,
    cluster,
    isReady: privy.isConfigured ? !privy.isLoading : isWalletStandardReady,
    canSignTransactions:
      embeddedWallet !== null ||
      (connectedWallet?.signer !== null && connectedWallet?.signer !== undefined),
    networkReady: embeddedWallet
      ? cluster === 'devnet'
      : !connectedWallet || connectedWallet.wallet.chains.includes(solanaWalletChain(cluster)),
    source: embeddedWallet ? 'embedded' : connectedAddress ? 'external' : null,
    isPrivyConfigured: privy.isConfigured,
    isPrivyAuthenticated: privy.isAuthenticated,
    isEmbeddedWalletPending:
      privy.isAuthenticated && !embeddedWallet && !connectedAddress && !privy.setupError,
    walletSetupError: privy.setupError,
    wallets: wallets.map((wallet) => ({ name: wallet.name, icon: wallet.icon })),
    startAuthentication: privy.login,
    retryWalletSetup: privy.retryWalletSetup,
    connect,
    disconnect: async () => {
      if (embeddedWallet) await privy.logout();
      else await disconnectWallet();
    },
    signMessage: async (message) => {
      const bytes = new TextEncoder().encode(message);
      if (embeddedWallet) return privy.signMessage(bytes);
      return signWalletMessage(bytes);
    },
    jitoExecution: embeddedJitoExecution,
  };
}
