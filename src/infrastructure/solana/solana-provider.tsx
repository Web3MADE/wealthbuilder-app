'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { ClientProvider, useClient } from '@solana/react';
import { createSolanaClient, type SolanaClient } from './solana-client';
import { solanaClusterFromEnvironment, type SolanaCluster } from './solana-config';

type SolanaClusterContextValue = Readonly<{
  cluster: SolanaCluster;
  setCluster: (cluster: SolanaCluster) => void;
}>;

const SolanaClusterContext = createContext<SolanaClusterContextValue | null>(null);

export function SolanaProvider({ children }: { children: ReactNode }) {
  const [cluster, setCluster] = useState<SolanaCluster>(solanaClusterFromEnvironment());
  const client = useMemo(() => createSolanaClient(cluster), [cluster]);
  const value = useMemo(() => ({ cluster, setCluster }), [cluster]);

  return (
    <SolanaClusterContext.Provider value={value}>
      <ClientProvider client={client}>{children}</ClientProvider>
    </SolanaClusterContext.Provider>
  );
}

export function useSolanaCluster(): SolanaClusterContextValue {
  const context = useContext(SolanaClusterContext);
  if (!context) throw new Error('useSolanaCluster must be used within SolanaProvider.');
  return context;
}

export function useSolanaClient() {
  return useClient<SolanaClient>();
}
