import { evaluateAction } from '@/application/recommendation-service';
import {
  atomic,
  usd,
  type PersonalWealthPolicy,
  type Portfolio,
  type ProposedAction,
} from '@/domain';

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
    riskTolerance: 'MODERATE',
    autonomy: {
      enabled: true,
      maxTransactionValue: usd(BigInt(input.autonomousLimitUsdc) * 1_000_000n),
      sessionMaxCumulativeValue: usd(100_000_000n),
      sessionDurationMinutes: 60,
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
      protocols: {
        get: () => ({
          describeCapabilities: () => [
            {
              protocolId: 'aave-v3',
              protocolType: 'LENDING',
              chain,
              supportedActions: ['SUPPLY'],
              supportedAssetIds: ['usdc'],
              authorizationModes: ['WALLET_APPROVAL'],
              riskTier: 'MODERATE',
              configurationVersion: 'demo',
            },
          ],
          supports: () => true,
          prepare: async () => {
            throw new Error('not used');
          },
          execute: async () => {
            throw new Error('not used');
          },
        }),
        findSupport: async () => [],
      },
      audit: { append: async () => undefined },
    },
    { policy, portfolio, action, now },
  );
}
