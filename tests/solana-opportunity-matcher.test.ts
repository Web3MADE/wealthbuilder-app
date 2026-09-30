import { describe, expect, it } from 'vitest';
import { matchSolanaOpportunities, type SolanaOpportunity } from '@/domain';

const opportunities: readonly SolanaOpportunity[] = [
  {
    id: 'conservative-liquid',
    protocol: 'Test protocol',
    name: 'Conservative liquid opportunity',
    asset: 'SOL',
    category: 'STAKING',
    riskLevel: 'CONSERVATIVE',
    liquidity: 'LIQUID',
    leverage: false,
    description: 'Test fixture',
    whyItExists: 'Test fixture',
    enabled: true,
    isDevelopmentFixture: true,
  },
  {
    id: 'balanced-limited',
    protocol: 'Test protocol',
    name: 'Balanced limited opportunity',
    asset: 'SOL',
    category: 'LENDING',
    riskLevel: 'BALANCED',
    liquidity: 'LIMITED',
    leverage: false,
    description: 'Test fixture',
    whyItExists: 'Test fixture',
    enabled: true,
    isDevelopmentFixture: true,
  },
  {
    id: 'growth-locked',
    protocol: 'Test protocol',
    name: 'Growth locked opportunity',
    asset: 'SOL',
    category: 'VAULT',
    riskLevel: 'GROWTH',
    liquidity: 'LOCKED',
    leverage: false,
    description: 'Test fixture',
    whyItExists: 'Test fixture',
    enabled: true,
    isDevelopmentFixture: true,
  },
  {
    id: 'leveraged-liquid',
    protocol: 'Test protocol',
    name: 'Leveraged opportunity',
    asset: 'SOL',
    category: 'VAULT',
    riskLevel: 'CONSERVATIVE',
    liquidity: 'LIQUID',
    leverage: true,
    description: 'Test fixture',
    whyItExists: 'Test fixture',
    enabled: true,
    isDevelopmentFixture: true,
  },
];

function match(
  preferences: Readonly<{
    goal: 'long-term-wealth' | 'preserve-crypto' | 'growth';
    timeline: '1-3-years' | '3-5-years' | '5-plus-years';
    risk: 'conservative' | 'balanced' | 'growth';
  }>,
  balance = 5_000_000_000n,
) {
  return matchSolanaOpportunities({ preferences, solBalanceLamports: balance, opportunities });
}

describe('Solana opportunity matcher', () => {
  it('limits eligibility by risk and always excludes leverage', () => {
    const conservative = match({
      goal: 'long-term-wealth',
      timeline: '5-plus-years',
      risk: 'conservative',
    });
    const balanced = match({
      goal: 'long-term-wealth',
      timeline: '5-plus-years',
      risk: 'balanced',
    });

    expect(conservative.eligibleOpportunities.map((opportunity) => opportunity.id)).toEqual([
      'conservative-liquid',
    ]);
    expect(balanced.eligibleOpportunities.map((opportunity) => opportunity.id)).toEqual([
      'conservative-liquid',
      'balanced-limited',
    ]);
  });

  it('filters opportunities by timeline liquidity needs', () => {
    expect(
      match({ goal: 'growth', timeline: '1-3-years', risk: 'growth' }).eligibleOpportunities.map(
        (opportunity) => opportunity.id,
      ),
    ).toEqual(['conservative-liquid']);
    expect(
      match({ goal: 'growth', timeline: '3-5-years', risk: 'growth' }).eligibleOpportunities.map(
        (opportunity) => opportunity.id,
      ),
    ).toEqual(['balanced-limited', 'conservative-liquid']);
  });

  it('uses the goal to rank otherwise eligible opportunities', () => {
    const preserve = match({ goal: 'preserve-crypto', timeline: '5-plus-years', risk: 'growth' });
    const growth = match({ goal: 'growth', timeline: '5-plus-years', risk: 'growth' });

    expect(preserve.selectedOpportunity?.id).toBe('conservative-liquid');
    expect(growth.selectedOpportunity?.id).toBe('growth-locked');
  });

  it('applies conservative deterministic allocation caps', () => {
    expect(
      match({ goal: 'long-term-wealth', timeline: '5-plus-years', risk: 'conservative' })
        .allocationPercent,
    ).toBe(10);
    expect(
      match({ goal: 'long-term-wealth', timeline: '1-3-years', risk: 'growth' }).allocationPercent,
    ).toBe(10);
    expect(
      match({ goal: 'growth', timeline: '5-plus-years', risk: 'growth' }).allocationPercent,
    ).toBe(30);
    expect(
      match({ goal: 'preserve-crypto', timeline: '5-plus-years', risk: 'growth' })
        .allocationPercent,
    ).toBe(10);
  });

  it('returns no match for zero SOL or no eligible opportunity', () => {
    expect(match({ goal: 'growth', timeline: '5-plus-years', risk: 'growth' }, 0n)).toMatchObject({
      selectedOpportunity: null,
      allocationPercent: null,
    });
    expect(
      matchSolanaOpportunities({
        preferences: { goal: 'growth', timeline: '1-3-years', risk: 'conservative' },
        solBalanceLamports: 1n,
        opportunities: opportunities.filter((opportunity) => opportunity.liquidity === 'LOCKED'),
      }),
    ).toMatchObject({ selectedOpportunity: null, allocationPercent: null });
  });
});
