import { describe, expect, it } from 'vitest';
import { canContinue, emptyPolicy, nextStep } from '@/presentation/onboarding/onboarding-state';

describe('onboarding view state', () => {
  it('requires selections on each decision step', () => {
    expect(canContinue(1, emptyPolicy)).toBe(false);
    const goal = { ...emptyPolicy, goal: 'Grow long-term wealth' };
    expect(canContinue(1, goal)).toBe(true);
    expect(canContinue(2, { ...goal, horizon: '10+ years' })).toBe(false);
    expect(canContinue(2, { ...goal, horizon: '10+ years', risk: 'Moderate' })).toBe(true);
    expect(canContinue(3, { ...goal, asset: 'BTC / ETH focused', liquidity: 'Balanced' })).toBe(
      false,
    );
    expect(
      canContinue(3, {
        ...goal,
        asset: 'BTC / ETH focused',
        liquidity: 'Balanced',
        ai: 'Prepare and I approve',
      }),
    ).toBe(true);
  });

  it('reaches completion and returns edits to review', () => {
    expect(nextStep(0)).toBe(1);
    expect(nextStep(4)).toBe(5);
    expect(nextStep(5)).toBe(5);
    expect(nextStep(2, true)).toBe(4);
  });
});
