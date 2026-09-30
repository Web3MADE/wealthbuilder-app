import {
  matchSolanaOpportunities,
  type SolanaOpportunity,
  type SolanaStrategyPreferences,
} from '@/domain';
import type {
  SolanaMatchExplainerPort,
  SolanaMatchExplanation,
} from './interfaces/solana-match-explainer';
import type { SolanaOpportunityRepositoryPort } from './interfaces/solana-opportunity-repository';

export type SolanaStrategyRecommendation = Readonly<{
  opportunity: SolanaOpportunity;
  allocationPercent: number;
  deterministicReasons: readonly string[];
  explanation: SolanaMatchExplanation | null;
  explanationError: string | null;
}>;

export type SolanaStrategyResult = Readonly<{
  recommendation: SolanaStrategyRecommendation | null;
  eligibleOpportunities: readonly SolanaOpportunity[];
  reasons: readonly string[];
}>;

/** Coordinates the deterministic matcher and a bounded explanatory AI adapter. */
export class SolanaStrategyService {
  constructor(
    private readonly opportunities: SolanaOpportunityRepositoryPort,
    private readonly explainer: SolanaMatchExplainerPort | null,
  ) {}

  async find(
    input: Readonly<{
      preferences: SolanaStrategyPreferences;
      solBalanceLamports: bigint;
    }>,
  ): Promise<SolanaStrategyResult> {
    const match = matchSolanaOpportunities({
      ...input,
      opportunities: await this.opportunities.listActive(),
    });
    if (!match.selectedOpportunity || match.allocationPercent === null)
      return {
        recommendation: null,
        eligibleOpportunities: match.eligibleOpportunities,
        reasons: match.reasons,
      };

    let explanation: SolanaMatchExplanation | null = null;
    let explanationError: string | null = null;
    if (!this.explainer) {
      explanationError = 'The match explanation is unavailable. Try again shortly.';
    } else {
      try {
        explanation = await this.explainer.explain({
          preferences: input.preferences,
          solBalanceLamports: input.solBalanceLamports,
          selectedOpportunity: match.selectedOpportunity,
          deterministicReasons: match.reasons,
          allocationPercent: match.allocationPercent,
        });
      } catch {
        explanationError = 'The match explanation is unavailable. Try again shortly.';
      }
    }

    return {
      recommendation: {
        opportunity: match.selectedOpportunity,
        allocationPercent: match.allocationPercent,
        deterministicReasons: match.reasons,
        explanation,
        explanationError,
      },
      eligibleOpportunities: match.eligibleOpportunities,
      reasons: match.reasons,
    };
  }
}
