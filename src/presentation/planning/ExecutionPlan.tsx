import type { ActionPlan } from '@/domain';

export type PlanStatus = 'proposed' | 'checking' | 'allowed' | 'blocked' | 'ready' | 'executed' | 'failed';
export const planStatuses: readonly PlanStatus[] = ['proposed', 'checking', 'allowed', 'blocked', 'ready', 'executed', 'failed'];
export type PlanPolicyEvaluation = Readonly<{
  actionIndex: number;
  actionId?: string;
  outcome: 'AUTONOMOUS_ALLOWED' | 'REQUIRES_APPROVAL' | 'BLOCKED';
  actionValueUsd: string;
  reasons: readonly Readonly<{ code: string; details: Readonly<Record<string, string>> }>[];
}>;
export type PlanExecution = Readonly<{
  status: 'preparing' | 'simulating' | 'submitted' | 'confirmed' | 'failed';
  reference?: string;
  approvalReference?: string;
  failureReason?: string;
  stages?: readonly string[];
}>;

function outcomeLabel(outcome: PlanPolicyEvaluation['outcome']) {
  if (outcome === 'AUTONOMOUS_ALLOWED') return 'Allowed';
  if (outcome === 'REQUIRES_APPROVAL') return 'Requires approval';
  return 'Blocked';
}

function reasonLabel(code: string) {
  return code.replace(/_/g, ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

export function ExecutionPlan({ plan, status, evaluations = [], executions = {}, onExecute }: {
  plan: ActionPlan;
  status: PlanStatus;
  evaluations?: readonly PlanPolicyEvaluation[];
  executions?: Readonly<Record<number, PlanExecution>>;
  onExecute?: (evaluation: PlanPolicyEvaluation) => void;
}) {
  return <section className="planning-result" aria-label="AI action plan"><div className="planning-result-heading"><div><small>AI ACTION PLAN</small><h2>{plan.summary}</h2></div><span className={`planning-status ${status}`}>{status}</span></div><p>{plan.reasoning}</p><ol className="planning-steps">{plan.steps.map((step, index) => <li key={`${index}-${step}`}><span>{index + 1}</span><span>{step}</span></li>)}</ol><h3>Proposed actions</h3>{plan.proposedActions.length === 0 && <p>No financial action proposed.</p>}{plan.proposedActions.map((action, index) => {
    const evaluation = evaluations.find((item) => item.actionIndex === index);
    const execution = executions[index];
    const canExecute = evaluation && evaluation.outcome !== 'BLOCKED' && evaluation.actionId && !execution;
    return <div className="planning-action" key={index}><strong>{action.type} {action.amount} {action.asset.toUpperCase()}</strong><span>{action.protocol} · {action.chain}</span>{evaluation && <div className={`planning-policy-decision ${evaluation.outcome.toLowerCase()}`}><b>Policy: {outcomeLabel(evaluation.outcome)}</b>{evaluation.reasons.length > 0 && <ul>{evaluation.reasons.map((reason, reasonIndex) => <li key={`${reason.code}-${reasonIndex}`}>{reasonLabel(reason.code)}</li>)}</ul>}</div>}{canExecute && <button type="button" className="planning-execute" onClick={() => onExecute?.(evaluation)}>{evaluation.outcome === 'REQUIRES_APPROVAL' ? 'Confirm & execute' : 'Execute on local fork'}</button>}{execution && <div className={`planning-execution ${execution.status}`}><b>{execution.status}</b>{execution.stages && <span>{execution.stages.join(' · ').toLowerCase()}</span>}{execution.reference && <code>{execution.reference}</code>}{execution.failureReason && <span>{execution.failureReason}</span>}</div>}</div>;
  })}<p className="planning-disclaimer">Proposal only. No transaction has been made.</p></section>;
}
