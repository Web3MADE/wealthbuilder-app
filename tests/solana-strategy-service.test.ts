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
        headline: 'A strategy that may fit',
        summary: 'A short explanation based on the supplied answers.',
        whyThisFits: ['One reason', 'Another reason', 'A third reason'],
        walletInsight: 'The visible holdings provide context for this example.',
        riskNote: 'Review before any action.',
        reviewWhen: ['Your goal changes.', 'You may need the money sooner.'],
      }).success,
    ).toBe(true);
    expect(
      SolanaMatchExplanationSchema.safeParse({
        headline: 'A strategy that may fit',
        summary: 'A short explanation based on the supplied answers.',
        whyThisFits: ['One reason', 'Another reason', 'A third reason'],
        walletInsight: 'The visible holdings provide context for this example.',
        riskNote: 'Review before any action.',
        reviewWhen: ['Your goal changes.', 'You may need the money sooner.'],
        protocol: 'AI cannot add this',
      }).success,
    ).toBe(false);
    expect(
      SolanaMatchExplanationSchema.safeParse({
        headline: 'A strategy that may fit',
        summary: 'You should use this approach.',
        whyThisFits: ['One reason', 'Another reason', 'A third reason'],
        walletInsight: 'The visible holdings provide context for this example.',
        riskNote: 'Review before any action.',
        reviewWhen: ['Your goal changes.', 'You may need the money sooner.'],
      }).success,
    ).toBe(false);
  });
});
