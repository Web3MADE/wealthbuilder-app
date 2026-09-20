'use client';

import { useAccount, useConnect, useDisconnect, useSignMessage, useSwitchChain } from 'wagmi';
import type { WalletConnection } from '@/application/interfaces/wallet';
import { appKit } from './providers';

export function useWalletConnection(): WalletConnection {
  const { address, chainId, status } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  return {
    address: address ?? null,
    chainId: chainId ?? null,
    status,
    connect: async () => {
      if (appKit) await appKit.open({ view: 'Connect' });
      else if (connectors[0]) await connectAsync({ connector: connectors[0] });
      else throw new Error('No compatible EVM wallet was found.');
    },
    disconnect: async () => {
      await disconnectAsync();
    },
    switchToFuji: async () => {
      await switchChainAsync({ chainId: 43113 });
    },
    sign: async (message) => signMessageAsync({ message }),
  };
}
