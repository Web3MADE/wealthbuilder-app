import type { PlanGoal } from '@/domain';
import type {
  GoalIntentClassification,
  GoalIntentClassifierPort,
} from './interfaces/goal-intent-classifier';

export class GoalIntentService {
  constructor(private readonly classifier: GoalIntentClassifierPort | null) {}

  async resolve(goalText: string): Promise<GoalIntentClassification | null> {
    if (this.classifier) {
      try {
        const classification = await this.classifier.classify(goalText);
        if (classification.confidence !== 'low') return classification;
      } catch {
        // A narrow deterministic fallback is used below.
      }
    }
    return fallbackGoalIntent(goalText);
  }
}

function fallbackGoalIntent(goalText: string): GoalIntentClassification | null {
  const text = goalText.toLowerCase();
  const matches = new Set<PlanGoal>();
  if (/\b(grow|growth|build wealth|increase value)\b/.test(text)) matches.add('grow');
  if (/\b(safer|safe|protect|preserve|reduce risk)\b/.test(text)) matches.add('safer');
  if (/\b(income|cash flow|regular earnings|earn regularly)\b/.test(text)) matches.add('income');
  if (/\b(freedom|flexibility|financial independence|optionality)\b/.test(text))
    matches.add('freedom');
  if (matches.size !== 1) return null;
  return { goal: [...matches][0]!, confidence: 'medium' };
}
