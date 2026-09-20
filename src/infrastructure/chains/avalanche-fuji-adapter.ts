import { createPublicClient, http, isAddress, type Address } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { z } from 'zod';
import type { ChainPort } from '@/application/interfaces/chain';
import type { PriceProviderPort } from '@/application/interfaces/pricing';
import {
  atomic,
  multiplyPrice,
  type AssetRef,
  type ChainRef,
  type Portfolio,
  type Position,
} from '@/domain';

const balanceOfAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
] as const;

export type FujiToken = Readonly<{ asset: AssetRef; address: Address }>;
const nativeAvax: AssetRef = { id: 'avax', symbol: 'AVAX', decimals: 18, isStablecoin: false };

const configuredTokenSchema = z.array(
  z.object({
    id: z.string().min(1),
    symbol: z.string().min(1),
    decimals: z.number().int().min(0).max(36),
    isStablecoin: z.boolean(),
    address: z.string().refine(isAddress),
  }),
);

export function parseFujiTokens(raw: string | undefined, usdcAddress: Address): FujiToken[] {
  const defaults: FujiToken[] = [
    {
      asset: { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true },
      address: usdcAddress,
    },
  ];
  if (!raw) return defaults;
  const extras = configuredTokenSchema.parse(JSON.parse(raw));
  const ids = new Set(defaults.map((token) => token.asset.id));
  for (const token of extras) {
    if (ids.has(token.id.toLowerCase())) throw new Error('Duplicate Fuji token ID.');
    ids.add(token.id.toLowerCase());
    defaults.push({
      asset: {
        id: token.id.toLowerCase(),
        symbol: token.symbol,
        decimals: token.decimals,
        isStablecoin: token.isStablecoin,
      },
      address: token.address as Address,
    });
  }
  return defaults;
}

export class AvalancheFujiAdapter implements ChainPort {
  private readonly client;
  constructor(
    rpcUrl: string,
    private readonly tokens: readonly FujiToken[],
    private readonly prices: PriceProviderPort,
  ) {
    this.client = createPublicClient({ chain: avalancheFuji, transport: http(rpcUrl) });
  }

  async getPortfolio(walletId: string, chain: ChainRef): Promise<Portfolio> {
    if (chain.id !== 'avalanche-fuji') throw new Error('Unsupported network.');
    if (!isAddress(walletId)) throw new Error('Invalid wallet address.');
    const address = walletId as Address;
    const assets = [nativeAvax, ...this.tokens.map((token) => token.asset)];
    const [nativeBalance, tokenBalances, quotes] = await Promise.all([
      this.client.getBalance({ address }),
      Promise.all(
        this.tokens.map((token) =>
          this.client.readContract({
            address: token.address,
            abi: balanceOfAbi,
            functionName: 'balanceOf',
            args: [address],
          }),
        ),
      ),
      this.prices.getQuotes(assets),
    ]);
    const balances = [nativeBalance, ...tokenBalances];
    const positions: Position[] = assets.map((asset, index) => {
      const amount = atomic(balances[index] ?? 0n, asset.decimals);
      const quote = quotes.find((candidate) => candidate.assetId === asset.id);
      return {
        asset,
        amount,
        value: multiplyPrice(amount, quote?.priceMicrosPerUnit ?? 0n),
        location: 'WALLET',
      };
    });
    const now = new Date();
    return {
      id: `fuji:${walletId.toLowerCase()}:${now.getTime()}`,
      walletId: walletId.toLowerCase(),
      chain: { id: 'avalanche-fuji' },
      capturedAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
      positions,
    };
  }
}
