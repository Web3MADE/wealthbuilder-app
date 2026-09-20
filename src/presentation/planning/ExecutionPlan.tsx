import type { ActionPlan } from '@/domain';

export type PlanStatus = 'proposed' | 'checking' | 'allowed' | 'blocked' | 'ready' | 'executed' | 'failed';
export const planStatuses: readonly PlanStatus[] = ['proposed', 'checking', 'allowed', 'blocked', 'ready', 'executed', 'failed'];

export function ExecutionPlan({ plan, status }: { plan: ActionPlan; status: PlanStatus }) {
  return <section className="planning-result" aria-label="AI action plan"><div className="planning-result-heading"><div><small>AI ACTION PLAN</small><h2>{plan.summary}</h2></div><span className={`planning-status ${status}`}>{status}</span></div><p>{plan.reasoning}</p><ol className="planning-steps">{plan.steps.map((step, index) => <li key={`${index}-${step}`}><span>{index + 1}</span><span>{step}</span></li>)}</ol><h3>Proposed actions</h3>{plan.proposedActions.map((action, index) => <div className="planning-action" key={index}><strong>{action.type} {action.amount} {action.asset.toUpperCase()}</strong><span>{action.protocol} · {action.chain}</span></div>)}<p className="planning-disclaimer">Proposal only. No policy decision or transaction has been made.</p></section>;
}
