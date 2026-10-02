'use client';

import { useMemo } from 'react';
import { SolanaTransferExecutor, type SolanaTransferRpc } from './solana-transfer';
import { useSolanaClient, useSolanaCluster } from './solana-provider';

export function useSolanaTransferExecutor() {
  const client = useSolanaClient();
  const { cluster } = useSolanaCluster();
  return useMemo(
    () =>
      new SolanaTransferExecutor({
        cluster,
        rpc: client.rpc as unknown as SolanaTransferRpc,
        payer: () => client.payer,
      }),
    [client, cluster],
  );
}
