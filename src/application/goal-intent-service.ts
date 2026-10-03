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
  const text = goalText.toLowerCase().replace(/[’']/g, "'");

  // This is deliberately small and transparent: it makes everyday phrasing work
  // when the optional model classifier is unavailable, without choosing a strategy.
  if (
    /\b(safe|safer|protect|preserve|risk|don't lose|do not lose|lose my money|less risk)\b/.test(
      text,
    )
  )
    return { goal: 'safer', confidence: 'medium' };
  if (/\b(income|passive|yield|cash flow|earn|regular earnings)\b/.test(text))
    return { goal: 'income', confidence: 'medium' };
  if (
    /\b(freedom|flexib(?:le|ility)|salary|independent|depend(?:ent|ence)|optionality)\b/.test(text)
  )
    return { goal: 'freedom', confidence: 'medium' };
  if (/\b(rich|grow|growth|wealth|money|compound|bag|increase|build wealth|make more)\b/.test(text))
    return { goal: 'grow', confidence: 'medium' };
  return null;
}
