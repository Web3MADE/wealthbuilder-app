'use client';

import { useMemo } from 'react';
import { JitoSolExecutor } from './jito-sol-executor';
import { useSolanaClient, useSolanaCluster } from './solana-provider';
import type { SolanaWalletConnection } from './use-solana-wallet';

export function useJitoSolExecutor(wallet: SolanaWalletConnection) {
  const client = useSolanaClient();
  const { cluster } = useSolanaCluster();
  return useMemo(
    () =>
      new JitoSolExecutor({
        cluster,
        rpc: client.rpc as never,
        payer: wallet.jitoExecution?.payer ?? (() => client.payer),
        ...(wallet.jitoExecution
          ? { submitTransaction: wallet.jitoExecution.submitTransaction }
          : {}),
      }),
    [client, cluster, wallet.jitoExecution],
  );
}
