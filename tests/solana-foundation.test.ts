import { address, type Address, type Lamports } from '@solana/kit';
import { describe, expect, it, vi } from 'vitest';
import { fetchSolBalance, type SolanaBalanceRpc } from '@/infrastructure/solana/solana-client';
import {
  nativeSol,
  solanaChain,
  SolanaPortfolioSource,
  solanaPortfolioService,
} from '@/infrastructure/solana/solana-portfolio-source';
import {
  solanaClusterFromEnvironment,
  solanaRpcUrls,
  solanaWalletChain,
} from '@/infrastructure/solana/solana-config';

const wallet = address('11111111111111111111111111111111');

function rpcWithBalance(value: Lamports): SolanaBalanceRpc {
  return {
    getBalance: vi.fn().mockReturnValue({ send: vi.fn().mockResolvedValue({ value }) }),
  } as unknown as SolanaBalanceRpc;
}

describe('Solana foundation configuration', () => {
  it('defaults to devnet and supports environment-configured localnet RPC endpoints', () => {
    expect(solanaClusterFromEnvironment({})).toBe('devnet');
    expect(solanaClusterFromEnvironment({ NEXT_PUBLIC_SOLANA_CLUSTER: 'localnet' })).toBe(
      'localnet',
    );
    expect(solanaRpcUrls('devnet').rpcUrl).toBe('https://api.devnet.solana.com');
    expect(
      solanaRpcUrls('localnet', {
        NEXT_PUBLIC_SOLANA_LOCALNET_RPC_URL: 'http://127.0.0.1:18899',
        NEXT_PUBLIC_SOLANA_LOCALNET_RPC_SUBSCRIPTIONS_URL: 'ws://127.0.0.1:18900',
      }),
    ).toEqual({
      rpcUrl: 'http://127.0.0.1:18899',
      rpcSubscriptionsUrl: 'ws://127.0.0.1:18900',
    });
    expect(solanaWalletChain('localnet')).toBe('solana:devnet');
  });

  it('reads a connected wallet balance through the configured RPC client', async () => {
    const send = vi.fn().mockResolvedValue({ value: 1_250_000_000n as Lamports });
    const getBalance = vi.fn().mockReturnValue({ send });
    const rpc: SolanaBalanceRpc = {
      getBalance: getBalance as unknown as (
        walletAddress: Address,
        config: Readonly<{ commitment: 'confirmed' }>,
      ) => Readonly<{ send: () => Promise<Readonly<{ value: Lamports }>> }>,
    };

    await expect(fetchSolBalance(rpc, wallet)).resolves.toBe(1_250_000_000n);
    expect(getBalance).toHaveBeenCalledWith(wallet, { commitment: 'confirmed' });
    expect(send).toHaveBeenCalledOnce();
  });

  it('maps a connected address and lamports to one native SOL wallet position', async () => {
    const now = new Date('2026-09-26T00:00:00.000Z');
    const source = new SolanaPortfolioSource(
      rpcWithBalance(1_250_000_000n as Lamports),
      'devnet',
      () => now,
    );

    const portfolio = await solanaPortfolioService(
      rpcWithBalance(1_250_000_000n as Lamports),
      'devnet',
    ).refresh(wallet, solanaChain('devnet'));
    const directPortfolio = await source.getPortfolio(wallet, solanaChain('devnet'));

    expect(portfolio.chain).toEqual({ id: 'solana-devnet' });
    expect(portfolio.walletId).toBe(wallet);
    expect(portfolio.positions).toEqual([
      {
        asset: nativeSol,
        amount: { value: 1_250_000_000n, decimals: 9 },
        value: { currency: 'USD', micros: 0n },
        location: 'WALLET',
      },
    ]);
    expect(directPortfolio.capturedAt).toEqual(now);
  });

  it('keeps a zero-SOL wallet visible and rejects an empty wallet address', async () => {
    const source = new SolanaPortfolioSource(rpcWithBalance(0n as Lamports), 'localnet');
    const portfolio = await source.getPortfolio(wallet, solanaChain('localnet'));

    expect(portfolio.positions[0]?.amount).toEqual({ value: 0n, decimals: 9 });
    await expect(source.getPortfolio('', solanaChain('localnet'))).rejects.toThrow(
      'Invalid Solana wallet address.',
    );
  });

  it('surfaces RPC failures without creating a portfolio', async () => {
    const source = new SolanaPortfolioSource(
      {
        getBalance: vi.fn().mockReturnValue({
          send: vi.fn().mockRejectedValue(new Error('RPC unavailable')),
        }),
      } as unknown as SolanaBalanceRpc,
      'devnet',
    );

    await expect(source.getPortfolio(wallet, solanaChain('devnet'))).rejects.toThrow(
      'RPC unavailable',
    );
  });
});
