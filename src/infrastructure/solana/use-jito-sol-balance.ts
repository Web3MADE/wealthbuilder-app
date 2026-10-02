'use client';

import { address, getAddressEncoder, getProgramDerivedAddress, type Address } from '@solana/kit';
import { useCallback, useEffect, useState } from 'react';
import { jitoSolDeployment } from './jito-sol-config';
import { useSolanaClient, useSolanaCluster } from './solana-provider';

const associatedTokenProgram = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const tokenProgram = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

export type JitoSolBalanceState = Readonly<{
  amount: bigint;
  status: 'idle' | 'loading' | 'ready' | 'error';
  refresh: () => Promise<bigint | null>;
}>;

/** Reads only the configured Devnet JitoSOL associated-token account. */
export function useJitoSolBalance(walletAddress: string | null): JitoSolBalanceState {
  const client = useSolanaClient();
  const { cluster } = useSolanaCluster();
  const [amount, setAmount] = useState(0n);
  const [status, setStatus] = useState<JitoSolBalanceState['status']>('idle');
  const refresh = useCallback(async (): Promise<bigint | null> => {
    const deployment = jitoSolDeployment(cluster);
    if (!walletAddress || !deployment) {
      setAmount(0n);
      setStatus('idle');
      return null;
    }
    setStatus('loading');
    try {
      const wallet = address(walletAddress);
      const mint = address(deployment.mint);
      const [tokenAccount] = await getProgramDerivedAddress({
        programAddress: associatedTokenProgram,
        seeds: [
          getAddressEncoder().encode(wallet),
          getAddressEncoder().encode(tokenProgram),
          getAddressEncoder().encode(mint),
        ],
      });
      const account = await (
        client.rpc as unknown as {
          getAccountInfo(
            tokenAccount: Address,
            config: Readonly<{ commitment: 'confirmed'; encoding: 'base64' }>,
          ): Readonly<{
            send: () => Promise<
              Readonly<{ value: Readonly<{ data: readonly [string, 'base64'] }> | null }>
            >;
          }>;
        }
      )
        .getAccountInfo(tokenAccount, { commitment: 'confirmed', encoding: 'base64' })
        .send();
      if (!account.value) {
        setAmount(0n);
        setStatus('ready');
        return 0n;
      }
      const data = Uint8Array.from(atob(account.value.data[0]), (character) =>
        character.charCodeAt(0),
      );
      if (data.length < 72) throw new Error('Configured JitoSOL token account data is invalid.');
      const next = new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(
        64,
        true,
      );
      setAmount(next);
      setStatus('ready');
      return next;
    } catch {
      setStatus('error');
      return null;
    }
  }, [client.rpc, cluster, walletAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { amount, status, refresh };
}
