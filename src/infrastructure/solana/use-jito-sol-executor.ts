'use client';

import { useMemo } from 'react';
import { JitoSolExecutor } from './jito-sol-executor';
import { useSolanaClient, useSolanaCluster } from './solana-provider';

export function useJitoSolExecutor() {
  const client = useSolanaClient();
  const { cluster } = useSolanaCluster();
  return useMemo(
    () =>
      new JitoSolExecutor({
        cluster,
        rpc: client.rpc as never,
        payer: () => client.payer,
      }),
    [client, cluster],
  );
}
