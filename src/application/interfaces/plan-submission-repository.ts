export type PlanSubmissionStart = Readonly<{
  id: string;
  source: 'wallet' | 'example';
  walletAddress: string | null;
  examplePreset: string | null;
  goal: string;
  timeHorizon: string;
  dropBehavior: string;
}>;

export type PlanSubmissionCompletion = Readonly<{
  portfolioSnapshot: unknown;
  strategy: string | null;
  allocation: unknown;
  deterministicReasons: readonly string[];
  ruledOut: unknown;
  aiExplanation: unknown;
}>;

export interface PlanSubmissionRepositoryPort {
  create(input: PlanSubmissionStart): Promise<void>;
  complete(id: string, input: PlanSubmissionCompletion): Promise<void>;
  fail(id: string, error: string): Promise<void>;
}
