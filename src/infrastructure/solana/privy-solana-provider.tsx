'use client';

import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import {
  useCreateWallet,
  useSignMessage,
  useSignTransaction,
  useWallets,
  type ConnectedStandardSolanaWallet,
} from '@privy-io/react-auth/solana';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { solanaRpcUrls } from './solana-config';

type PrivyLoginMethod = 'google' | 'email';

export type PrivySolanaSession = Readonly<{
  isConfigured: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  wallet: ConnectedStandardSolanaWallet | null;
  setupError: string | null;
  login: (method: PrivyLoginMethod) => void;
  logout: () => Promise<void>;
  retryWalletSetup: () => Promise<void>;
  signTransaction: (transaction: Uint8Array) => Promise<Uint8Array>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}>;

const unavailableSession: PrivySolanaSession = {
  isConfigured: false,
  isLoading: false,
  isAuthenticated: false,
  wallet: null,
  setupError: null,
  login: () => undefined,
  logout: async () => undefined,
  retryWalletSetup: async () => undefined,
  signTransaction: async () => {
    throw new Error('Privy is not configured.');
  },
  signMessage: async () => {
    throw new Error('Privy is not configured.');
  },
};

const PrivySolanaSessionContext = createContext<PrivySolanaSession>(unavailableSession);
const walletProvisioningTimeoutMs = 15_000;
const devnetRpcUrls = solanaRpcUrls('devnet');

/**
 * Keeps Privy-specific authentication and embedded-wallet APIs at the
 * infrastructure edge. The rest of the product consumes the wallet through
 * `useSolanaWallet` just as it does for Wallet Standard wallets.
 */
export function PrivySolanaProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <PrivySolanaSessionContext.Provider value={unavailableSession}>
        {children}
      </PrivySolanaSessionContext.Provider>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['google', 'email'],
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        solana: {
          rpcs: {
            'solana:devnet': {
              rpc: createSolanaRpc(devnetRpcUrls.rpcUrl),
              rpcSubscriptions: createSolanaRpcSubscriptions(devnetRpcUrls.rpcSubscriptionsUrl),
            },
          },
        },
      }}
    >
      <PrivySolanaSessionProvider>{children}</PrivySolanaSessionProvider>
    </PrivyProvider>
  );
}

function PrivySolanaSessionProvider({ children }: { children: ReactNode }) {
  const { authenticated, login, logout, ready } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { signTransaction } = useSignTransaction();
  const { signMessage } = useSignMessage();
  const [setupError, setSetupError] = useState<string | null>(null);

  const wallet = useMemo(
    () =>
      wallets.find(
        (candidate) =>
          'isPrivyWallet' in candidate.standardWallet && candidate.standardWallet.isPrivyWallet,
      ) ?? null,
    [wallets],
  );
  const waitingForWallet = ready && authenticated && walletsReady && !wallet;

  useEffect(() => {
    if (!waitingForWallet) {
      setSetupError(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      setSetupError('We could not finish setting up your wallet. Please try again.');
    }, walletProvisioningTimeoutMs);
    return () => window.clearTimeout(timeout);
  }, [waitingForWallet]);

  const retryWalletSetup = useCallback(async () => {
    setSetupError(null);
    try {
      await createWallet();
    } catch (error) {
      // A creation request can race the automatic login creation. Wallet state
      // remains authoritative, so surface an error only while it is absent.
      if (!wallet)
        setSetupError(
          error instanceof Error
            ? 'We could not finish setting up your wallet. Please try again.'
            : 'We could not finish setting up your wallet. Please try again.',
        );
    }
  }, [createWallet, wallet]);

  const value = useMemo<PrivySolanaSession>(
    () => ({
      isConfigured: true,
      isLoading: !ready || (authenticated && !walletsReady) || (waitingForWallet && !setupError),
      isAuthenticated: authenticated,
      wallet,
      setupError,
      login: (method) => login({ loginMethods: [method] }),
      logout,
      retryWalletSetup,
      signTransaction: async (transaction) => {
        if (!wallet) throw new Error('Your embedded wallet is not ready.');
        return (await signTransaction({ transaction, wallet, chain: 'solana:devnet' }))
          .signedTransaction;
      },
      signMessage: async (message) => {
        if (!wallet) throw new Error('Your embedded wallet is not ready.');
        return (await signMessage({ message, wallet })).signature;
      },
    }),
    [
      authenticated,
      login,
      logout,
      ready,
      retryWalletSetup,
      setupError,
      signMessage,
      signTransaction,
      waitingForWallet,
      wallet,
      walletsReady,
    ],
  );

  return (
    <PrivySolanaSessionContext.Provider value={value}>
      {children}
    </PrivySolanaSessionContext.Provider>
  );
}

export function usePrivySolanaSession(): PrivySolanaSession {
  return useContext(PrivySolanaSessionContext);
}
