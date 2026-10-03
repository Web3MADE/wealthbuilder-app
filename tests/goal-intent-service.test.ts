import { describe, expect, it } from 'vitest';
import { GoalIntentService } from '@/application/goal-intent-service';

describe('GoalIntentService deterministic fallback', () => {
  const service = new GoalIntentService(null);

  it.each([
    ['I wanna get rich', 'grow'],
    ['I want to get rich over the next 3 years', 'grow'],
    ['grow my bag', 'grow'],
    ['keep my money safe', 'safer'],
    ["don't lose my money", 'safer'],
    ['passive income', 'income'],
    ['earn from my crypto', 'income'],
    ['less dependent on my salary', 'freedom'],
  ] as const)('maps casual goal text: %s', async (goalText, goal) => {
    await expect(service.resolve(goalText)).resolves.toMatchObject({ goal, confidence: 'medium' });
  });

  it('keeps genuinely unusable input unresolved', async () => {
    await expect(service.resolve('asdf')).resolves.toBeNull();
  });
});
