import { evaluateAction } from '@/application/recommendation-service';
import { PortfolioService } from '@/application/portfolio-service';
import { PolicyService } from '@/application/policy-service';
import { WalletAuthService } from '@/application/wallet-auth-service';
import {
  AvalancheFujiAdapter,
  parseFujiTokens,
} from '@/infrastructure/chains/avalanche-fuji-adapter';
import { ConfiguredFujiPrices } from '@/infrastructure/pricing/configured-fuji-prices';
import { DrizzlePolicyRepository } from '@/infrastructure/persistence/drizzle-policy-repository';
import { DrizzleUserRepository } from '@/infrastructure/persistence/drizzle-user-repository';
import { createDatabase } from '@/infrastructure/persistence/postgres';
import { SiweVerifier } from '@/infrastructure/auth/siwe';
import { aaveV3Fuji, fujiRpcUrl } from '@/config';
import {
  atomic,
  usd,
  type PersonalWealthPolicy,
  type Portfolio,
  type ProposedAction,
} from '@/domain';

let database: ReturnType<typeof createDatabase> | null = null;
function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required for wallet identity and policy persistence.');
  return (database ??= createDatabase(url));
}

export function portfolioService() {
  const prices = new ConfiguredFujiPrices();
  const chain = new AvalancheFujiAdapter(
    process.env.FUJI_RPC_URL ?? fujiRpcUrl,
    parseFujiTokens(process.env.FUJI_ERC20_TOKENS_JSON, aaveV3Fuji.assets.usdc!),
    prices,
  );
  return new PortfolioService(chain);
}

export function policyService() {
  return new PolicyService(new DrizzlePolicyRepository(db()));
}

export function walletAuthService() {
  return new WalletAuthService(new SiweVerifier(), new DrizzleUserRepository(db()));
}

export async function evaluateDemoAction(
  input: Readonly<{ amountUsdc: number; reserveBps: number; autonomousLimitUsdc: number }>,
) {
  const now = new Date();
  const chain = { id: 'avalanche-fuji' };
  const asset = { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true };
  const portfolio: Portfolio = {
    id: 'demo-portfolio',
    walletId: 'demo-wallet',
    chain,
    capturedAt: now,
    expiresAt: new Date(now.getTime() + 300_000),
    positions: [
      { asset, amount: atomic(100_000_000n, 6), value: usd(100_000_000n), location: 'WALLET' },
    ],
  };
  const policy: PersonalWealthPolicy = {
    id: 'demo-policy',
    version: 1,
    walletId: 'demo-wallet',
    chain,
    allowedAssetIds: ['usdc'],
    excludedAssetIds: [],
    maxAssetConcentrationBps: 10_000,
    minimumLiquidStableReserveBps: input.reserveBps,
    maxSingleTransactionValue: usd(100_000_000n),
    allowedProtocolIds: ['aave-v3'],
    autonomy: {
      enabled: true,
      maxTransactionValue: usd(BigInt(input.autonomousLimitUsdc) * 1_000_000n),
    },
    createdAt: now,
  };
  const action: ProposedAction = {
    id: crypto.randomUUID(),
    type: 'SUPPLY',
    walletId: 'demo-wallet',
    chain,
    asset,
    amount: atomic(BigInt(input.amountUsdc) * 1_000_000n, 6),
    protocolId: 'aave-v3',
    protocolType: 'LENDING',
    policyVersion: 1,
    portfolioId: portfolio.id,
    createdAt: now,
    expiresAt: portfolio.expiresAt,
  };
  return evaluateAction(
    {
      prices: {
        getQuotes: async () => [
          {
            assetId: 'usdc',
            priceMicrosPerUnit: 1_000_000n,
            quotedAt: now,
            expiresAt: portfolio.expiresAt,
          },
        ],
      },
      audit: { append: async () => undefined },
    },
    { policy, portfolio, action, now },
  );
}
