import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';
import type {
  GoalIntentClassification,
  GoalIntentClassifierPort,
} from '@/application/interfaces/goal-intent-classifier';
import { GroqConfigSchema, type GroqConfig } from './groq-ai-planner';

export const GoalIntentClassificationSchema: z.ZodType<GoalIntentClassification> = z
  .object({
    goal: z.enum(['grow', 'safer', 'income', 'freedom']),
    confidence: z.enum(['high', 'medium', 'low']),
  })
  .strict();

/** Bounded interpretation of a stated goal; it never selects a plan. */
export class GroqGoalIntentClassifier implements GoalIntentClassifierPort {
  private readonly config: GroqConfig;

  constructor(config: GroqConfig) {
    this.config = GroqConfigSchema.parse(config);
  }

  async classify(goalText: string): Promise<GoalIntentClassification> {
    const { text } = await generateText({
      model: createGroq({ apiKey: this.config.apiKey })(this.config.model),
      instructions: `Classify only the user's stated crypto goal. Return only strict JSON with goal and confidence. goal must be exactly one of grow, safer, income, or freedom. confidence must be high, medium, or low. Do not select a strategy, allocation, protocol, asset, risk level, or execution action. Use low confidence when the answer is unclear or contains competing goals.`,
      prompt: JSON.stringify({ goalText }),
      maxOutputTokens: 80,
    });
    return GoalIntentClassificationSchema.parse(parseJson(text));
  }
}

function parseJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const candidate = fenced?.[1] ?? jsonObjectIn(trimmed);
  return JSON.parse(candidate);
}

function jsonObjectIn(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}
