import type { ProposedAction, PolicyDecision } from '@/domain';
import type { ChatActionEvaluation } from '@/application/chat-policy-service';

type PendingAction = Readonly<{
  action: ProposedAction;
  decision: PolicyDecision;
}>;

/** Process-local, single-use execution intents for the local fork development flow. */
export class DevChatExecutionStore {
  private readonly pending = new Map<string, PendingAction>();
  private readonly consumed = new Set<string>();

  register(evaluations: readonly ChatActionEvaluation[]) {
    for (const evaluation of evaluations)
      this.pending.set(evaluation.action.id, { action: evaluation.action, decision: evaluation.decision });
  }

  consume(actionId: string): PendingAction | null {
    if (this.consumed.has(actionId)) return null;
    const pending = this.pending.get(actionId);
    if (!pending) return null;
    this.consumed.add(actionId);
    return pending;
  }
}

const storeKey = Symbol.for('wealthbuilder.devChatExecutionStore');
export function devChatExecutionStore(): DevChatExecutionStore {
  const runtime = globalThis as typeof globalThis & { [storeKey]?: DevChatExecutionStore };
  return (runtime[storeKey] ??= new DevChatExecutionStore());
}
