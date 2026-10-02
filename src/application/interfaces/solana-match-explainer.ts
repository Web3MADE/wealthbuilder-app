import type {
  PlanAllocation,
  PlanSuitability,
  RuledOutStrategy,
  SolanaOpportunity,
  SolanaStrategyPreferences,
} from '@/domain';

export type SolanaMatchExplanation = Readonly<{
  headline: string;
  summary: string;
  reasons: readonly string[];
  riskNote: string;
}>;

export interface SolanaMatchExplainerPort {
  explain(
    input: Readonly<{
      preferences: SolanaStrategyPreferences;
      solBalanceLamports: bigint;
      selectedOpportunity: SolanaOpportunity;
      deterministicReasons: readonly string[];
      allocationPercent: number;
      planSuitability?: PlanSuitability;
      allocation?: readonly PlanAllocation[];
      ruledOut?: readonly RuledOutStrategy[];
    }>,
  ): Promise<SolanaMatchExplanation>;
}
