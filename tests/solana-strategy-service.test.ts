import { describe, expect, it } from 'vitest';
import { SolanaStrategyService } from '@/application/solana-strategy-service';
import type { SolanaMatchExplainerPort } from '@/application/interfaces/solana-match-explainer';
import type { SolanaOpportunityRepositoryPort } from '@/application/interfaces/solana-opportunity-repository';
import { SolanaMatchExplanationSchema } from '@/infrastructure/ai/solana-match-explainer';
import type { SolanaOpportunity } from '@/domain';

const opportunity: SolanaOpportunity = {
  id: 'fixture',
  protocol: 'Fixture protocol',
  name: 'Fixture opportunity',
  asset: 'SOL',
  category: 'STAKING',
  riskLevel: 'CONSERVATIVE',
  liquidity: 'LIQUID',
  leverage: false,
  description: 'Fixture',
  whyItExists: 'Fixture',
  enabled: true,
  isDevelopmentFixture: true,
};

const repository: SolanaOpportunityRepositoryPort = {
  listActive: async () => [opportunity],
};

describe('Solana strategy service', () => {
  it('keeps the deterministic selection and allocation even when AI returns extra data', async () => {
    const explainer: SolanaMatchExplainerPort = {
      explain: async () =>
        ({
          headline: 'Fixture match',
          summary: 'A validated explanation.',
          reasons: ['Reason one', 'Reason two'],
          riskNote: 'Review before taking any action.',
          allocationPercent: 100,
          protocol: 'Changed by AI',
        }) as never,
    };
    const result = await new SolanaStrategyService(repository, explainer).find({
      preferences: { goal: 'long-term-wealth', timeline: '5-plus-years', risk: 'balanced' },
      solBalanceLamports: 2_000_000_000n,
    });

    expect(result.recommendation?.opportunity).toEqual(opportunity);
    expect(result.recommendation?.allocationPercent).toBe(20);
    expect(result.recommendation?.explanation?.headline).toBe('Fixture match');
  });

  it('keeps a match when AI explanation generation fails', async () => {
    const result = await new SolanaStrategyService(repository, {
      explain: async () => Promise.reject(new Error('provider unavailable')),
    }).find({
      preferences: { goal: 'long-term-wealth', timeline: '5-plus-years', risk: 'balanced' },
      solBalanceLamports: 2_000_000_000n,
    });

    expect(result.recommendation?.opportunity.id).toBe('fixture');
    expect(result.recommendation?.explanation).toBeNull();
    expect(result.recommendation?.explanationError).toContain('unavailable');
  });

  it('strictly validates the bounded AI explanation response', () => {
    expect(
      SolanaMatchExplanationSchema.safeParse({
        headline: 'A match',
        summary: 'A short explanation.',
        reasons: ['One reason', 'Two reasons'],
        riskNote: 'Review before any action.',
      }).success,
    ).toBe(true);
    expect(
      SolanaMatchExplanationSchema.safeParse({
        headline: 'A match',
        summary: 'A short explanation.',
        reasons: ['One reason'],
        riskNote: 'Review before any action.',
        protocol: 'AI cannot add this',
      }).success,
    ).toBe(false);
  });
});
