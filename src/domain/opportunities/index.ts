export const solanaStrategyGoals = ['long-term-wealth', 'preserve-crypto', 'growth'] as const;
export const solanaStrategyTimelines = ['1-3-years', '3-5-years', '5-plus-years'] as const;
export const solanaStrategyRisks = ['conservative', 'balanced', 'growth'] as const;

export type SolanaStrategyGoal = (typeof solanaStrategyGoals)[number];
export type SolanaStrategyTimeline = (typeof solanaStrategyTimelines)[number];
export type SolanaStrategyRisk = (typeof solanaStrategyRisks)[number];

export type SolanaStrategyPreferences = Readonly<{
  goal: SolanaStrategyGoal;
  timeline: SolanaStrategyTimeline | null;
  risk: SolanaStrategyRisk | null;
}>;

export type SolanaOpportunityCategory = 'STAKING' | 'LENDING' | 'VAULT';
export type SolanaOpportunityRiskLevel = 'CONSERVATIVE' | 'BALANCED' | 'GROWTH';
export type SolanaOpportunityLiquidity = 'LIQUID' | 'LIMITED' | 'LOCKED';
export type SolanaOpportunityAsset = 'SOL' | 'STABLECOIN';

export type SolanaPortfolioComposition = Readonly<{
  availableAssets: readonly SolanaOpportunityAsset[];
  preferredAsset: SolanaOpportunityAsset;
}>;

/** A curated Solana strategy. Protocol execution remains outside this model. */
export type SolanaOpportunity = Readonly<{
  id: string;
  protocol: string;
  name: string;
  asset: SolanaOpportunityAsset;
  category: SolanaOpportunityCategory;
  riskLevel: SolanaOpportunityRiskLevel;
  liquidity: SolanaOpportunityLiquidity;
  leverage: boolean;
  description: string;
  whyItExists: string;
  enabled: boolean;
  isDevelopmentFixture: boolean;
}>;

export type SolanaOpportunityMatch = Readonly<{
  selectedOpportunity: SolanaOpportunity | null;
  eligibleOpportunities: readonly SolanaOpportunity[];
  reasons: readonly string[];
  allocationPercent: number | null;
}>;
