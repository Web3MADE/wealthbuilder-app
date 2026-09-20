import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AvalancheFujiAdapter,
  parseFujiTokens,
} from '../src/infrastructure/chains/avalanche-fuji-adapter';
import { ConfiguredFujiPrices } from '../src/infrastructure/pricing/configured-fuji-prices';

const wallet = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const token = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
let server: Server;
let url: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString()) as { id: number; method: string };
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          result:
            body.method === 'eth_getBalance'
              ? '0xde0b6b3a7640000'
              : `0x${'2faf080'.padStart(64, '0')}`,
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server address.');
  url = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Avalanche Fuji portfolio adapter', () => {
  it('reads native AVAX and test USDC then normalizes balances', async () => {
    const adapter = new AvalancheFujiAdapter(
      url,
      [
        {
          asset: { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true },
          address: token,
        },
      ],
      new ConfiguredFujiPrices(),
    );
    const portfolio = await adapter.getPortfolio(wallet, { id: 'avalanche-fuji' });
    expect(portfolio.walletId).toBe(wallet);
    expect(portfolio.positions.map((position) => position.asset.symbol)).toEqual(['AVAX', 'USDC']);
    expect(portfolio.positions[0]?.amount.value).toBe(1_000_000_000_000_000_000n);
    expect(portfolio.positions[1]?.amount.value).toBe(50_000_000n);
    expect(portfolio.positions[1]?.value.micros).toBe(50_000_000n);
    expect(portfolio.positions[0]?.value.micros).toBe(0n);
  });

  it('rejects unsupported networks before reading RPC', async () => {
    const adapter = new AvalancheFujiAdapter(url, [], new ConfiguredFujiPrices());
    await expect(adapter.getPortfolio(wallet, { id: 'avalanche-mainnet' })).rejects.toThrow(
      'Unsupported network',
    );
  });

  it('accepts configured test ERC-20s alongside USDC', () => {
    const tokens = parseFujiTokens(
      JSON.stringify([
        {
          id: 'test-dai',
          symbol: 'DAI',
          decimals: 18,
          isStablecoin: true,
          address: token,
        },
      ]),
      wallet,
    );
    expect(tokens.map((entry) => entry.asset.id)).toEqual(['usdc', 'test-dai']);
  });
});
