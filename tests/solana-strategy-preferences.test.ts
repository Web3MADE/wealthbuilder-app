import { describe, expect, it } from 'vitest';
import {
  defaultSolanaStrategyPreferences,
  isCompleteSolanaStrategyPreferences,
  loadSolanaStrategyPreferences,
  saveSolanaStrategyPreferences,
  solanaStrategyPreferencesStorageKey,
} from '@/presentation/solana/solana-strategy-preferences';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('Solana strategy preferences', () => {
  it('starts with the recommended long-term goal and requires timeline and risk', () => {
    expect(defaultSolanaStrategyPreferences).toEqual({
      goal: 'long-term-wealth',
      timeline: null,
      risk: null,
    });
    expect(isCompleteSolanaStrategyPreferences(defaultSolanaStrategyPreferences)).toBe(false);
  });

  it('persists a complete selection for the current browser session', () => {
    const storage = memoryStorage();
    const preferences = {
      goal: 'preserve-crypto' as const,
      timeline: '3-5-years' as const,
      risk: 'balanced' as const,
    };

    saveSolanaStrategyPreferences(storage, preferences);

    const restored = loadSolanaStrategyPreferences(storage);
    expect(restored).toEqual(preferences);
    expect(isCompleteSolanaStrategyPreferences(restored)).toBe(true);
  });

  it('safely falls back when saved values are malformed or unsupported', () => {
    const storage = memoryStorage({
      [solanaStrategyPreferencesStorageKey]: JSON.stringify({
        goal: 'retire-next-week',
        timeline: 'forever',
        risk: 'maximum',
      }),
    });

    expect(loadSolanaStrategyPreferences(storage)).toEqual(defaultSolanaStrategyPreferences);
  });
});
