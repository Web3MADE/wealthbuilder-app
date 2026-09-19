import type { ActionState, ProposedAction } from '../actions/index';
export type RecommendationMetadata = Readonly<{
  version: number;
  provider: string;
  model: string;
  promptVersion: string;
}>;
export type Recommendation = Readonly<{
  id: string;
  action: ProposedAction;
  title: string;
  rationale: string;
  state: ActionState;
  metadata: RecommendationMetadata;
  createdAt: Date;
}>;
