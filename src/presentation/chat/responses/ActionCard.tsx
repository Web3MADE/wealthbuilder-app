import { ArrowRight, CircleDollarSign, Layers3, Sparkles } from 'lucide-react';
import type { ActionPlan } from '@/domain';
import type { PlanPolicyEvaluation } from '@/presentation/planning/ExecutionPlan';
import { PolicyDecision } from './PolicyDecision';
import { actionEffect, actionTitle, protocolName } from './response-utils';

export function ActionCard({
  action,
  plan,
  evaluation,
  onExecute,
}: {
  action: ActionPlan['proposedActions'][number];
  plan: ActionPlan;
  evaluation: PlanPolicyEvaluation;
  onExecute: () => void;
}) {
  const canExecute = evaluation.outcome !== 'BLOCKED' && Boolean(evaluation.actionId);

  return (
    <section className="chat-response-card chat-action-card" aria-label="Proposed financial action">
      <div className="chat-response-kicker">
        <Sparkles aria-hidden="true" />
        <span>Proposed action</span>
      </div>
      <h2>{actionTitle(action)}</h2>
      <div className="chat-action-facts">
        <div>
          <CircleDollarSign aria-hidden="true" />
          <span>Amount</span>
          <strong>
            {action.amount} {action.asset.toUpperCase()}
          </strong>
        </div>
        <div>
          <Layers3 aria-hidden="true" />
          <span>Destination</span>
          <strong>{protocolName(action.protocol)}</strong>
        </div>
        <div>
          <ArrowRight aria-hidden="true" />
          <span>Effect</span>
          <strong>{actionEffect(action)}</strong>
        </div>
      </div>
      {evaluation.outcome !== 'BLOCKED' && (
        <p className="chat-action-rationale">{plan.reasoning}</p>
      )}
      <PolicyDecision evaluation={evaluation} />
      {canExecute && (
        <button type="button" className="chat-primary-action" onClick={onExecute}>
          {evaluation.outcome === 'REQUIRES_APPROVAL' ? 'Confirm and execute' : 'Execute action'}
          <ArrowRight aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
