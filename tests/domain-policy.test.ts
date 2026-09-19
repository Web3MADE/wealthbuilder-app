import { describe, expect, it } from 'vitest';
import {
  atomic,
  evaluatePolicy,
  usd,
  type PersonalWealthPolicy,
  type Portfolio,
  type ProposedAction,
} from '../src/domain';

const now = new Date('2026-09-19T00:00:00.000Z');
const chain = { id: 'avalanche-fuji' };
const usdc = { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true };
const portfolio: Portfolio = {
  id: 'p1',
  walletId: 'w1',
  chain,
  capturedAt: now,
  expiresAt: new Date('2026-09-19T00:05:00.000Z'),
  positions: [
    { asset: usdc, amount: atomic(100_000_000n, 6), value: usd(100_000_000n), location: 'WALLET' },
  ],
};
const policy: PersonalWealthPolicy = {
  id: 'policy',
  version: 1,
  walletId: 'w1',
  chain,
  allowedAssetIds: ['usdc'],
  excludedAssetIds: [],
  maxAssetConcentrationBps: 10_000,
  minimumLiquidStableReserveBps: 2_000,
  maxSingleTransactionValue: usd(100_000_000n),
  allowedProtocolIds: ['aave-v3'],
  riskTolerance: 'MODERATE',
  autonomy: {
    enabled: true,
    maxTransactionValue: usd(25_000_000n),
    sessionMaxCumulativeValue: usd(100_000_000n),
    sessionDurationMinutes: 60,
  },
  createdAt: now,
};
const action = (amount: bigint): ProposedAction => ({
  id: 'a1',
  type: 'SUPPLY',
  walletId: 'w1',
  chain,
  asset: usdc,
  amount: atomic(amount, 6),
  protocolId: 'aave-v3',
  protocolType: 'LENDING',
  policyVersion: 1,
  portfolioId: 'p1',
  createdAt: now,
  expiresAt: portfolio.expiresAt,
});
const context = {
  now,
  portfolio,
  quotes: [
    {
      assetId: 'usdc',
      priceMicrosPerUnit: 1_000_000n,
      quotedAt: now,
      expiresAt: portfolio.expiresAt,
    },
  ],
  protocolRisk: 'MODERATE' as const,
};

describe('policy evaluation', () => {
  it('allows a bounded supply autonomously', () =>
    expect(evaluatePolicy(policy, action(10_000_000n), context).outcome).toBe(
      'AUTONOMOUS_ALLOWED',
    ));
  it('blocks a supply that breaks the stable reserve', () =>
    expect(evaluatePolicy(policy, action(90_000_000n), context).outcome).toBe('BLOCKED'));
  it('never allows an excluded asset', () =>
    expect(
      evaluatePolicy({ ...policy, excludedAssetIds: ['usdc'] }, action(10_000_000n), context)
        .outcome,
    ).toBe('BLOCKED'));
});
