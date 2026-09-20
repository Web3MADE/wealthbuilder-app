import type { ExecutionResult, PolicyDecision, ProposedAction } from '@/domain';
import type { ExecutionPort } from './interfaces/execution';

function failed(action: ProposedAction, failureReason: string): ExecutionResult {
  return { actionId: action.id, state: 'FAILED', failureReason, stages: ['FAILED'] };
}

/**
 * Applies the policy gate before handing a normalized action to infrastructure.
 * The executor receives neither an AI plan nor a client-supplied transaction.
 */
export async function executeApprovedAction(
  executor: ExecutionPort,
  input: Readonly<{
    action: ProposedAction;
    decision: PolicyDecision;
    confirmedByUser: boolean;
    activePolicyVersion: number;
    now?: Date;
  }>,
): Promise<ExecutionResult> {
  const now = input.now ?? new Date();
  if (input.decision.outcome === 'BLOCKED')
    return failed(input.action, 'This action is blocked by your Wealth Policy.');
  if (input.decision.outcome === 'REQUIRES_APPROVAL' && !input.confirmedByUser)
    return failed(input.action, 'Confirm this action before it can execute.');
  if (input.action.policyVersion !== input.activePolicyVersion)
    return failed(input.action, 'Your Wealth Policy changed after this action was evaluated.');
  if (input.action.expiresAt <= now)
    return failed(input.action, 'This action expired before execution.');
  return executor.execute(input.action);
}
