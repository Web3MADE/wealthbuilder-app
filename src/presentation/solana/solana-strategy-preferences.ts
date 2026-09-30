import {
  solanaStrategyGoals,
  solanaStrategyRisks,
  solanaStrategyTimelines,
  type SolanaStrategyGoal,
  type SolanaStrategyPreferences,
  type SolanaStrategyRisk,
  type SolanaStrategyTimeline,
} from '@/domain';
export {
  solanaStrategyGoals,
  solanaStrategyRisks,
  solanaStrategyTimelines,
  type SolanaStrategyGoal,
  type SolanaStrategyPreferences,
  type SolanaStrategyRisk,
  type SolanaStrategyTimeline,
} from '@/domain';

export const solanaStrategyPreferencesStorageKey = 'wealthbuilder.solana.strategy-preferences';

export const defaultSolanaStrategyPreferences: SolanaStrategyPreferences = {
  goal: 'long-term-wealth',
  timeline: null,
  risk: null,
};

export const solanaStrategyGoalLabels: Readonly<Record<SolanaStrategyGoal, string>> = {
  'long-term-wealth': 'Build long-term wealth',
  'preserve-crypto': 'Preserve my crypto',
  growth: 'Grow more aggressively',
};

export const solanaStrategyTimelineLabels: Readonly<Record<SolanaStrategyTimeline, string>> = {
  '1-3-years': '1–3 years',
  '3-5-years': '3–5 years',
  '5-plus-years': '5+ years',
};

export const solanaStrategyRiskLabels: Readonly<Record<SolanaStrategyRisk, string>> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  growth: 'Growth',
};

type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function includes<Value extends string>(values: readonly Value[], value: unknown): value is Value {
  return typeof value === 'string' && values.includes(value as Value);
}

export function isCompleteSolanaStrategyPreferences(
  preferences: SolanaStrategyPreferences,
): preferences is SolanaStrategyPreferences & {
  timeline: SolanaStrategyTimeline;
  risk: SolanaStrategyRisk;
} {
  return preferences.timeline !== null && preferences.risk !== null;
}

export function loadSolanaStrategyPreferences(
  storage: Pick<Storage, 'getItem'>,
): SolanaStrategyPreferences {
  try {
    const saved = storage.getItem(solanaStrategyPreferencesStorageKey);
    if (!saved) return defaultSolanaStrategyPreferences;
    const value: unknown = JSON.parse(saved);
    if (!value || typeof value !== 'object') return defaultSolanaStrategyPreferences;
    const { goal, timeline, risk } = value as Record<string, unknown>;
    if (!includes(solanaStrategyGoals, goal)) return defaultSolanaStrategyPreferences;
    return {
      goal,
      timeline: includes(solanaStrategyTimelines, timeline) ? timeline : null,
      risk: includes(solanaStrategyRisks, risk) ? risk : null,
    };
  } catch {
    return defaultSolanaStrategyPreferences;
  }
}

export function saveSolanaStrategyPreferences(
  storage: SessionStorageLike,
  preferences: SolanaStrategyPreferences,
): void {
  storage.setItem(solanaStrategyPreferencesStorageKey, JSON.stringify(preferences));
}
