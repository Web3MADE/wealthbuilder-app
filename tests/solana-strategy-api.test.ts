import { describe, expect, it } from 'vitest';
import { solanaStrategyRequestSchema } from '@/app/api/solana/strategy/strategy-request';

describe('Solana strategy API input', () => {
  it('rejects malformed preferences and balance input', () => {
    expect(
      solanaStrategyRequestSchema.safeParse({
        goal: 'make-me-rich',
        timeline: 'forever',
        risk: 'maximum',
        solBalanceLamports: '-1',
        cluster: 'mainnet',
      }).success,
    ).toBe(false);
  });
});
