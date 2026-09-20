import type { ActionPlan } from '@/domain';

export type PlannerMetadata = Readonly<{
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
  schemaValidationFailure: boolean;
}>;

export type PlannerResult = Readonly<{ plan: ActionPlan; metadata: PlannerMetadata }>;

export class PlanningError extends Error {
  constructor(
    public readonly code: 'PROVIDER_ERROR' | 'INVALID_PLAN',
    public readonly metadata: PlannerMetadata,
  ) {
    super(code === 'INVALID_PLAN' ? 'The AI returned an invalid action plan.' : 'The AI provider is unavailable.');
  }
}

export interface AIPlannerPort {
  generate(input: Readonly<{ request: string }>): Promise<PlannerResult>;
}
