import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchSolanaPortfolio,
  SolanaPortfolioError,
} from '@/infrastructure/solana/opendex-solana-portfolio';

const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const wrappedSolMint = 'So11111111111111111111111111111111111111112';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENDEX_API_KEY;
  delete process.env.OPENDEX_API_BASE_URL;
  delete process.env.SOLANA_MAINNET_RPC_URL;
});

describe('Solana portfolio reader', () => {
  it('reads native and aggregated SPL balances from Solana RPC and enriches with OpenDEX', async () => {
    process.env.OPENDEX_API_KEY = 'test-key';
    process.env.SOLANA_MAINNET_RPC_URL = 'https://solana-rpc.example';
    const requests: { url: string; body: Record<string, unknown> | undefined }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        const body = init?.body
          ? (JSON.parse(String(init.body)) as Record<string, unknown>)
          : undefined;
        requests.push({ url, body });
        if (body?.method === 'getBalance')
          return Response.json({ result: { value: 2_000_000_000 } });
        if (body?.method === 'getTokenAccountsByOwner') {
          const program = (body.params as { programId: string }[])[1]!.programId;
          return Response.json({
            result: {
              value: program.startsWith('Tokenkeg')
                ? [tokenAccount(usdcMint, '12.5'), tokenAccount(usdcMint, '7.5')]
                : [],
            },
          });
        }
        return Response.json([
          {
            tokenAddress: wrappedSolMint,
            tokenName: 'Wrapped SOL',
            tokenSymbol: 'SOL',
            quote: { priceUsd: 100 },
          },
          {
            tokenAddress: usdcMint,
            tokenName: 'USD Coin',
            tokenSymbol: 'USDC',
            quote: { priceUsd: 1 },
          },
        ]);
      }),
    );

    const portfolio = await fetchSolanaPortfolio('wallet');

    expect(portfolio).toMatchObject({
      solBalance: '2',
      solUsdValue: 200,
      approximateTotalUsdValue: 220,
      isPartial: false,
    });
    expect(portfolio.topTokenHoldings).toEqual([
      { mint: usdcMint, name: 'USD Coin', symbol: 'USDC', amount: '20', usdValue: 20 },
    ]);
    expect(requests.filter(({ url }) => url === 'https://solana-rpc.example')).toHaveLength(3);
    expect(requests.some(({ url }) => url.includes('/rpc/sol'))).toBe(false);
    expect(
      requests
        .filter(({ url }) => url === 'https://solana-rpc.example')
        .map(({ body }) => body?.method),
    ).toEqual(['getBalance', 'getTokenAccountsByOwner', 'getTokenAccountsByOwner']);
    expect(requests.some(({ url }) => url.includes('/v2/traders/'))).toBe(false);
  });

  it('keeps Token-2022 and unpriced holdings visible when metadata lookup fails', async () => {
    process.env.OPENDEX_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        const body = init?.body
          ? (JSON.parse(String(init.body)) as Record<string, unknown>)
          : undefined;
        if (body?.method === 'getBalance') return Response.json({ result: { value: 0 } });
        if (body?.method === 'getTokenAccountsByOwner') {
          const program = (body.params as { programId: string }[])[1]!.programId;
          return Response.json({
            result: {
              value: program.startsWith('Tokenz') ? [tokenAccount('unknown-mint', '3')] : [],
            },
          });
        }
        return new Response('unavailable', { status: 503 });
      }),
    );

    const portfolio = await fetchSolanaPortfolio('wallet');

    expect(portfolio.topTokenHoldings[0]).toMatchObject({
      mint: 'unknown-mint',
      amount: '3',
      usdValue: null,
    });
    expect(portfolio.isPartial).toBe(true);
  });

  it('returns the portfolio-specific error when the RPC cannot be reached', async () => {
    process.env.OPENDEX_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    await expect(fetchSolanaPortfolio('wallet')).rejects.toEqual(
      new SolanaPortfolioError('Solana could not retrieve this wallet right now.'),
    );
  });
});

function tokenAccount(mint: string, uiAmountString: string) {
  return { account: { data: { parsed: { info: { mint, tokenAmount: { uiAmountString } } } } } };
}
