'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { avalancheFuji as appKitFuji } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { avalancheFuji } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const adapter = projectId
  ? new WagmiAdapter({ networks: [appKitFuji], projectId, ssr: true })
  : null;

export const appKit =
  adapter && projectId
    ? createAppKit({
        adapters: [
          adapter as unknown as NonNullable<Parameters<typeof createAppKit>[0]['adapters']>[number],
        ],
        networks: [appKitFuji],
        defaultNetwork: appKitFuji,
        projectId,
        metadata: {
          name: 'WealthBuilder',
          description: 'Fuji portfolio and wealth policy',
          url: typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin,
          icons: [],
        },
        features: { email: false, socials: [], swaps: false, onramp: false, analytics: false },
      })
    : null;

const fallbackConfig = createConfig({
  chains: [avalancheFuji],
  connectors: [injected()],
  transports: { [avalancheFuji.id]: http() },
  ssr: true,
});

export function WalletProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={adapter?.wagmiConfig ?? fallbackConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
