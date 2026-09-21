'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { avalancheFuji } from 'wagmi/chains';

const config = createConfig({
  chains: [avalancheFuji],
  connectors: [injected()],
  transports: { [avalancheFuji.id]: http() },
  ssr: true,
});

export function WalletProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
