import {
  solanaStrategyGoals,
  solanaStrategyRisks,
  solanaStrategyTimelines,
  type SolanaStrategyPreferences,
} from '@/domain';
import type { SolanaCluster } from '@/infrastructure/solana/solana-config';
import { defaultSolanaStrategyPreferences } from './solana-strategy-preferences';

export type SolanaDemoResumeState = 'portfolio' | 'preferences' | 'recommendation' | 'review';

export type PersistedActiveSolanaStrategy = Readonly<{
  walletAddress: string;
  cluster: SolanaCluster;
  opportunityId: string;
  signature: string;
  confirmedAt: string;
  depositedLamports: string;
}>;

export type SolanaDemoState = Readonly<{
  preferences: SolanaStrategyPreferences;
  resumeState: SolanaDemoResumeState;
  activeStrategy: PersistedActiveSolanaStrategy | null;
}>;

const storagePrefix = 'wealthbuilder.solana.demo.v1';

export function solanaDemoStorageKey(walletAddress: string, cluster: SolanaCluster): string {
  return `${storagePrefix}:${cluster}:${walletAddress}`;
}

export function loadSolanaDemoState(
  storage: Pick<Storage, 'getItem'>,
  walletAddress: string,
  cluster: SolanaCluster,
): SolanaDemoState {
  try {
    const saved = storage.getItem(solanaDemoStorageKey(walletAddress, cluster));
    if (!saved) return emptySolanaDemoState();
    const value: unknown = JSON.parse(saved);
    if (!value || typeof value !== 'object') return emptySolanaDemoState();
    const candidate = value as Record<string, unknown>;
    const preferences = parsePreferences(candidate.preferences);
    const resumeState = parseResumeState(candidate.resumeState);
    const activeStrategy = parseActiveStrategy(candidate.activeStrategy, walletAddress, cluster);
    return { preferences, resumeState, activeStrategy };
  } catch {
    return emptySolanaDemoState();
  }
}

export function saveSolanaDemoState(
  storage: Pick<Storage, 'setItem'>,
  walletAddress: string,
  cluster: SolanaCluster,
  state: SolanaDemoState,
): void {
  storage.setItem(solanaDemoStorageKey(walletAddress, cluster), JSON.stringify(state));
}

export function emptySolanaDemoState(): SolanaDemoState {
  return {
    preferences: defaultSolanaStrategyPreferences,
    resumeState: 'portfolio',
    activeStrategy: null,
  };
}

function parsePreferences(value: unknown): SolanaStrategyPreferences {
  if (!value || typeof value !== 'object') return defaultSolanaStrategyPreferences;
  const candidate = value as Record<string, unknown>;
  if (!solanaStrategyGoals.includes(candidate.goal as (typeof solanaStrategyGoals)[number]))
    return defaultSolanaStrategyPreferences;
  return {
    goal: candidate.goal as SolanaStrategyPreferences['goal'],
    timeline: solanaStrategyTimelines.includes(
      candidate.timeline as (typeof solanaStrategyTimelines)[number],
    )
      ? (candidate.timeline as NonNullable<SolanaStrategyPreferences['timeline']>)
      : null,
    risk: solanaStrategyRisks.includes(candidate.risk as (typeof solanaStrategyRisks)[number])
      ? (candidate.risk as NonNullable<SolanaStrategyPreferences['risk']>)
      : null,
  };
}

function parseResumeState(value: unknown): SolanaDemoResumeState {
  return value === 'preferences' || value === 'recommendation' || value === 'review'
    ? value
    : 'portfolio';
}

function parseActiveStrategy(
  value: unknown,
  walletAddress: string,
  cluster: SolanaCluster,
): PersistedActiveSolanaStrategy | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.walletAddress !== walletAddress ||
    candidate.cluster !== cluster ||
    typeof candidate.opportunityId !== 'string' ||
    typeof candidate.signature !== 'string' ||
    typeof candidate.confirmedAt !== 'string' ||
    Number.isNaN(new Date(candidate.confirmedAt).getTime()) ||
    typeof candidate.depositedLamports !== 'string' ||
    !/^\d+$/.test(candidate.depositedLamports)
  )
    return null;
  return {
    walletAddress,
    cluster,
    opportunityId: candidate.opportunityId,
    signature: candidate.signature,
    confirmedAt: candidate.confirmedAt,
    depositedLamports: candidate.depositedLamports,
  };
}
