import type { PlanGoal } from '@/domain';

export type GoalIntentClassification = Readonly<{
  goal: PlanGoal;
  confidence: 'high' | 'medium' | 'low';
}>;

export interface GoalIntentClassifierPort {
  classify(goalText: string): Promise<GoalIntentClassification>;
}
