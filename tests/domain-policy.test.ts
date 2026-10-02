import { describe, expect, it } from 'vitest';
import {
  atomic,
  evaluatePolicy,
  multiplyPrice,
  usd,
  type AssetRef,
  type PersonalWealthPolicy,
  type Portfolio,
  type Position,
  type ProposedAction,
  type SupplyAction,
} from '../src/domain';

const now = new Date('2026-09-19T00:00:00.000Z');
const chain = { id: 'test-chain' };
const usdc: AssetRef = { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true };
const dai: AssetRef = { id: 'dai', symbol: 'DAI', decimals: 6, isStablecoin: true };
const eth: AssetRef = { id: 'eth', symbol: 'ETH', decimals: 6, isStablecoin: false };
const doge: AssetRef = { id: 'doge', symbol: 'DOGE', decimals: 6, isStablecoin: false };

const position = (asset: AssetRef, valueMicros: bigint): Position => ({
  asset,
  amount: atomic(valueMicros, asset.decimals),
  value: usd(valueMicros),
  location: 'WALLET',
});

const portfolio = (
  positions: readonly Position[] = [
    position(usdc, 3_000_000_000n),
    position(dai, 1_000_000_000n),
    position(eth, 6_000_000_000n),
  ],
): Portfolio => ({
  id: 'portfolio-1',
  walletId: 'wallet-1',
  chain,
  capturedAt: now,
  expiresAt: new Date('2026-09-19T00:05:00.000Z'),
  positions,
});

const policy = (overrides: Partial<PersonalWealthPolicy> = {}): PersonalWealthPolicy => ({
  id: 'policy-1',
  version: 1,
  walletId: 'wallet-1',
  chain,
  allowedAssetIds: ['usdc', 'eth', 'avax'],
  excludedAssetIds: [],
  maxAssetConcentrationBps: 4_000,
  minimumLiquidStableReserveBps: 2_000,
  maxSingleTransactionValue: usd(1_000_000_000n),
  allowedProtocolIds: ['aave'],
  autonomy: {
    enabled: true,
    maxTransactionValue: usd(100_000_000n),
  },
  createdAt: now,
  ...overrides,
});

const supply = (amountMicros: bigint, overrides: Partial<SupplyAction> = {}): SupplyAction => ({
  id: 'action-1',
  type: 'SUPPLY',
  walletId: 'wallet-1',
  chain,
  asset: usdc,
  amount: atomic(amountMicros, usdc.decimals),
  protocolId: 'aave',
  protocolType: 'LENDING',
  policyVersion: 1,
  portfolioId: 'portfolio-1',
  createdAt: now,
  expiresAt: new Date('2026-09-19T00:05:00.000Z'),
  ...overrides,
});

const evaluate = (
  action: ProposedAction,
  selectedPolicy = policy(),
  selectedPortfolio = portfolio(),
) =>
  evaluatePolicy(selectedPolicy, action, {
    now,
    portfolio: selectedPortfolio,
    quotes: [usdc, dai, eth, doge].map((asset) => ({
      assetId: asset.id,
      priceMicrosPerUnit: 1_000_000n,
      quotedAt: now,
      expiresAt: selectedPortfolio.expiresAt,
    })),
  });

describe('policy evaluation', () => {
  it('allows a valid small supply autonomously', () => {
    expect(evaluate(supply(50_000_000n)).outcome).toBe('AUTONOMOUS_ALLOWED');
  });

  it('requires approval for a valid supply above the autonomy limit', () => {
    const decision = evaluate(supply(500_000_000n));

    expect(decision.outcome).toBe('REQUIRES_APPROVAL');
    expect(decision.violations.map((violation) => violation.code)).toEqual([
      'AUTONOMY_LIMIT_EXCEEDED',
    ]);
  });

  it('blocks a supply above the maximum transaction value', () => {
    const decision = evaluate(supply(1_500_000_000n));

    expect(decision.outcome).toBe('BLOCKED');
    expect(decision.violations.map((violation) => violation.code)).toContain(
      'TRANSACTION_LIMIT_EXCEEDED',
    );
  });

  it('blocks an excluded asset even when it is otherwise allowed', () => {
    const decision = evaluate(
      supply(50_000_000n, { asset: doge, amount: atomic(50_000_000n, doge.decimals) }),
      policy({ allowedAssetIds: ['usdc', 'doge'], excludedAssetIds: ['doge'] }),
    );

    expect(decision.outcome).toBe('BLOCKED');
    expect(decision.violations.map((violation) => violation.code)).toContain('ASSET_EXCLUDED');
  });

  it('blocks an asset that is not in the allowed-assets list', () => {
    const decision = evaluate(
      supply(50_000_000n, { asset: doge, amount: atomic(50_000_000n, doge.decimals) }),
    );

    expect(decision.outcome).toBe('BLOCKED');
    expect(decision.violations).toContainEqual({
      code: 'ASSET_NOT_ALLOWED',
      details: { assetId: 'doge' },
    });
  });

  it('blocks a protocol that is not allowed', () => {
    const decision = evaluate(supply(50_000_000n, { protocolId: 'compound' }));

    expect(decision.outcome).toBe('BLOCKED');
    expect(decision.violations.map((violation) => violation.code)).toContain(
      'PROTOCOL_NOT_ALLOWED',
    );
  });

  it('blocks a supply that would exceed the maximum asset concentration', () => {
    const concentratedPortfolio = portfolio([
      position(usdc, 3_700_000_000n),
      position(dai, 1_000_000_000n),
      position(eth, 5_300_000_000n),
    ]);
    const decision = evaluate(supply(600_000_000n), policy(), concentratedPortfolio);

    expect(decision.outcome).toBe('BLOCKED');
    expect(decision.violations.map((violation) => violation.code)).toContain(
      'ASSET_CONCENTRATION_EXCEEDED',
    );
  });

  it('blocks a supply that would breach the liquid stablecoin reserve', () => {
    const lowReservePortfolio = portfolio([
      position(usdc, 2_500_000_000n),
      position(dai, 500_000_000n),
      position(eth, 7_000_000_000n),
    ]);
    const decision = evaluate(
      supply(1_001_000_000n),
      policy({ maxSingleTransactionValue: usd(2_000_000_000n) }),
      lowReservePortfolio,
    );

    expect(decision.outcome).toBe('BLOCKED');
    expect(decision.violations.map((violation) => violation.code)).toContain(
      'LIQUIDITY_RESERVE_BREACHED',
    );
  });

  it('allows exact transaction, autonomy, concentration, and reserve boundaries', () => {
    const exactConcentrationPortfolio = portfolio([
      position(usdc, 3_700_000_000n),
      position(dai, 1_000_000_000n),
      position(eth, 5_300_000_000n),
    ]);
    const exactConcentration = evaluate(
      supply(500_000_000n),
      policy(),
      exactConcentrationPortfolio,
    );
    expect(exactConcentration.violations.map((violation) => violation.code)).not.toContain(
      'ASSET_CONCENTRATION_EXCEEDED',
    );

    const exactReservePortfolio = portfolio([
      position(usdc, 2_200_000_000n),
      position(dai, 1_000_000_000n),
      position(eth, 6_800_000_000n),
    ]);
    const exactReserve = evaluate(supply(1_000_000_000n), policy(), exactReservePortfolio);
    expect(exactReserve.violations.map((violation) => violation.code)).not.toContain(
      'TRANSACTION_LIMIT_EXCEEDED',
    );
    expect(exactReserve.violations.map((violation) => violation.code)).not.toContain(
      'LIQUIDITY_RESERVE_BREACHED',
    );

    const exactAutonomy = evaluate(supply(100_000_000n));
    expect(exactAutonomy.outcome).toBe('AUTONOMOUS_ALLOWED');
  });

  it('calculates monetary values with integer micros', () => {
    expect(multiplyPrice(atomic(1n, 6), 1_000_000n)).toEqual(usd(1n));
    expect(multiplyPrice(atomic(3n, 0), 1_500_000n)).toEqual(usd(4_500_000n));
  });
});
