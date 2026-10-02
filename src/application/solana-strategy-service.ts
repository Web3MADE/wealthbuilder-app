import {
  matchSolanaOpportunities,
  type PlanAllocation,
  type SolanaOpportunity,
  type PlanSuitability,
  type PersonalWealthProfile,
  type PublicWalletSnapshotFacts,
  type RuledOutStrategy,
  type SolanaPortfolioComposition,
  type SolanaStrategyPreferences,
} from '@/domain';
import type {
  SolanaMatchExplainerPort,
  SolanaMatchExplanation,
} from './interfaces/solana-match-explainer';
import type { SolanaOpportunityRepositoryPort } from './interfaces/solana-opportunity-repository';
import { deterministicPlanExplanation } from './plan-explanation-fallback';

export type SolanaStrategyRecommendation = Readonly<{
  opportunity: SolanaOpportunity;
  allocationPercent: number;
  allocation: readonly PlanAllocation[] | null;
  ruledOut: readonly RuledOutStrategy[];
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
      portfolioComposition?: SolanaPortfolioComposition;
      planSuitability?: PlanSuitability;
      goalText?: string;
      wealthProfile?: PersonalWealthProfile;
      walletSnapshot?: PublicWalletSnapshotFacts;
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

    const fallback =
      input.planSuitability && input.wealthProfile && input.walletSnapshot && match.allocation
        ? deterministicPlanExplanation({
            opportunity: match.selectedOpportunity,
            allocation: match.allocation,
            deterministicReasons: match.reasons,
            wealthProfile: input.wealthProfile,
            walletSnapshot: input.walletSnapshot,
          })
        : null;
    let explanation: SolanaMatchExplanation | null = fallback;
    let explanationError: string | null = null;
    if (!this.explainer) {
      explanationError = 'groq unavailable';
    } else {
      try {
        explanation = await this.explainer.explain({
          preferences: input.preferences,
          solBalanceLamports: input.solBalanceLamports,
          selectedOpportunity: match.selectedOpportunity,
          deterministicReasons: match.reasons,
          allocationPercent: match.allocationPercent,
          ...(input.planSuitability ? { planSuitability: input.planSuitability } : {}),
          ...(input.goalText ? { goalText: input.goalText } : {}),
          ...(match.allocation ? { allocation: match.allocation } : {}),
          ...(match.ruledOut ? { ruledOut: match.ruledOut } : {}),
          ...(input.wealthProfile ? { wealthProfile: input.wealthProfile } : {}),
          ...(input.walletSnapshot ? { walletSnapshot: input.walletSnapshot } : {}),
        });
      } catch (error) {
        explanationError = explanationFailureReason(error);
      }
    }

    return {
      recommendation: {
        opportunity: match.selectedOpportunity,
        allocationPercent: match.allocationPercent,
        allocation: match.allocation ?? null,
        ruledOut: match.ruledOut ?? [],
        deterministicReasons: match.reasons,
        explanation,
        explanationError,
      },
      eligibleOpportunities: match.eligibleOpportunities,
      reasons: match.reasons,
    };
  }
}

function explanationFailureReason(error: unknown): string {
  if (error instanceof SyntaxError) return 'groq malformed output';
  if (error instanceof Error && error.message.includes('unsupported claim'))
    return 'groq unsupported claim rejected';
  if (error instanceof Error && error.name === 'ZodError') return 'groq validation rejected';
  return 'groq unavailable';
}
