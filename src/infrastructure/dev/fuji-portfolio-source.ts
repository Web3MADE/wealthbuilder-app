import { createPublicClient, http, type Address } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { PortfolioService } from '@/application/portfolio-service';
import { aaveV3Fuji, fujiRpcUrl } from '@/config';
import { atomic, usd, type Portfolio } from '@/domain';
import { AvalancheFujiAdapter, parseFujiTokens } from '@/infrastructure/chains/avalanche-fuji-adapter';
import { ConfiguredFujiPrices } from '@/infrastructure/pricing/configured-fuji-prices';

export const fujiKernelAccount = '0x5C95e74145Dd455c7022cC0625BD9519E160d09c' as const;

const dataProviderAbi = [{
  type: 'function',
  name: 'getUserReserveData',
  stateMutability: 'view',
  inputs: [{ name: 'asset', type: 'address' }, { name: 'user', type: 'address' }],
  outputs: [
    { name: 'currentATokenBalance', type: 'uint256' },
    { name: 'currentStableDebt', type: 'uint256' },
    { name: 'currentVariableDebt', type: 'uint256' },
    { name: 'principalStableDebt', type: 'uint256' },
    { name: 'scaledVariableDebt', type: 'uint256' },
    { name: 'stableBorrowRate', type: 'uint256' },
    { name: 'liquidityRate', type: 'uint256' },
    { name: 'stableRateLastUpdated', type: 'uint40' },
    { name: 'usageAsCollateralEnabled', type: 'bool' },
  ],
}] as const;

/**
 * Process-local source for the development Kernel account. It is intentionally
 * the one read path for the chat context and the portfolio presentation APIs.
 */
export class FujiPortfolioSource {
  private readonly rpcUrl = process.env.FUJI_RPC_URL ?? fujiRpcUrl;
  private readonly client = createPublicClient({ chain: avalancheFuji, transport: http(this.rpcUrl) });
  private cached: Portfolio | null = null;

  async load(walletId: string = fujiKernelAccount): Promise<Portfolio> {
    if (this.cached?.walletId.toLowerCase() === walletId.toLowerCase()) return this.cached;
    return this.refresh(walletId);
  }

  async refresh(walletId: string = fujiKernelAccount): Promise<Portfolio> {
    const usdc = aaveV3Fuji.assets.usdc!;
    const wallet = await new PortfolioService(
      new AvalancheFujiAdapter(this.rpcUrl, parseFujiTokens(undefined, usdc), new ConfiguredFujiPrices()),
    ).refresh(walletId, { id: 'avalanche-fuji' });
    const reserve = await this.client.readContract({
      address: aaveV3Fuji.poolDataProviderAddress,
      abi: dataProviderAbi,
      functionName: 'getUserReserveData',
      args: [usdc, walletId as Address],
    });
    const suppliedUsdc = reserve[0];
    const portfolio: Portfolio = {
      ...wallet,
      positions: [
        ...wallet.positions.filter((position) => position.asset.id === 'usdc'),
        {
          asset: { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true },
          amount: atomic(suppliedUsdc, 6),
          value: usd(suppliedUsdc),
          location: 'SUPPLIED',
          protocolId: aaveV3Fuji.id,
        },
      ],
    };
    this.record(portfolio);
    return portfolio;
  }

  record(portfolio: Portfolio) {
    this.cached = { ...portfolio, positions: portfolio.positions.filter((position) => position.asset.id === 'usdc') };
  }
}

const sourceKey = Symbol.for('wealthbuilder.fujiPortfolioSource');

export function fujiPortfolioSource(): FujiPortfolioSource {
  const runtime = globalThis as typeof globalThis & { [sourceKey]?: FujiPortfolioSource };
  return (runtime[sourceKey] ??= new FujiPortfolioSource());
}
