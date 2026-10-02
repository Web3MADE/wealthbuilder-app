import type {
  PlanAllocation,
  PlanSuitability,
  PersonalWealthProfile,
  PublicWalletSnapshotFacts,
  RuledOutStrategy,
  SolanaOpportunity,
  SolanaStrategyPreferences,
} from '@/domain';

export type SolanaMatchExplanation = Readonly<{
  headline: string;
  summary: string;
  whyThisFits?: readonly string[];
  /** Kept optional while the shared Solana experience completes its V2 transition. */
  reasons?: readonly string[];
  walletInsight?: string;
  riskNote: string;
  reviewWhen?: readonly string[];
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
      goalText?: string;
      allocation?: readonly PlanAllocation[];
      ruledOut?: readonly RuledOutStrategy[];
      wealthProfile?: PersonalWealthProfile;
      walletSnapshot?: PublicWalletSnapshotFacts;
    }>,
  ): Promise<SolanaMatchExplanation>;
}
