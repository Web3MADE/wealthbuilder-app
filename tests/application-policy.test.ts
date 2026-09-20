import { describe, expect, it } from 'vitest';
import {
  atomic,
  usd,
  type AuditEvent,
  type PersonalWealthPolicy,
  type Portfolio,
  type ProposedAction,
} from '../src/domain';
import { evaluateAction } from '../src/application/recommendation-service';

const now = new Date('2026-09-19T00:00:00.000Z');
const chain = { id: 'avalanche-fuji' };
const asset = { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true };
const portfolio: Portfolio = {
  id: 'portfolio-1',
  walletId: 'wallet-1',
  chain,
  capturedAt: now,
  expiresAt: new Date('2026-09-19T00:05:00.000Z'),
  positions: [
    { asset, amount: atomic(100_000_000n, 6), value: usd(100_000_000n), location: 'WALLET' },
  ],
};
const policy: PersonalWealthPolicy = {
  id: 'policy-1',
  version: 1,
  walletId: 'wallet-1',
  chain,
  allowedAssetIds: ['usdc'],
  excludedAssetIds: [],
  maxAssetConcentrationBps: 10_000,
  minimumLiquidStableReserveBps: 2_000,
  maxSingleTransactionValue: usd(100_000_000n),
  allowedProtocolIds: ['aave-v3'],
  autonomy: {
    enabled: true,
    maxTransactionValue: usd(25_000_000n),
  },
  createdAt: now,
};
const action: ProposedAction = {
  id: 'action-1',
  type: 'SUPPLY',
  walletId: 'wallet-1',
  chain,
  asset,
  amount: atomic(10_000_000n, 6),
  protocolId: 'aave-v3',
  protocolType: 'LENDING',
  policyVersion: 1,
  portfolioId: 'portfolio-1',
  createdAt: now,
  expiresAt: portfolio.expiresAt,
};

describe('evaluateAction', () =>
  it('orchestrates ports while domain policy remains deterministic', async () => {
    const events: AuditEvent[] = [];
    const decision = await evaluateAction(
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
        audit: {
          append: async (event) => {
            events.push(event);
          },
        },
      },
      { policy, portfolio, action, now },
    );
    expect(decision.outcome).toBe('AUTONOMOUS_ALLOWED');
    expect(events[0]?.type).toBe('PolicyEvaluated');
  }));
