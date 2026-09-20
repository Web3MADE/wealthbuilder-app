import type { ExecutionResult, ProposedAction } from '@/domain';

/** Executes one already-approved normalized domain action. */
export interface ExecutionPort {
  execute(action: ProposedAction): Promise<ExecutionResult>;
}
