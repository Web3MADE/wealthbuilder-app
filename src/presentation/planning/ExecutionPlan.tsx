import type { ActionPlan } from '@/domain';
import Link from 'next/link';

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
  status: 'preparing' | 'executing' | 'confirming' | 'completed' | 'failed';
  reference?: string;
  failureReason?: string;
  retryable?: boolean;
  portfolio?: Readonly<{ walletUsdc: string; suppliedUsdc: string }>;
}>;
export type PlanExecutionAuthority = Readonly<{
  smartAccountAddress?: string;
  status: 'not_ready' | 'ready' | 'active';
  expiresAt?: string;
}>;

function policyCopy(outcome: PlanPolicyEvaluation['outcome']) {
  if (outcome === 'AUTONOMOUS_ALLOWED') return { title: 'Allowed automatically', detail: 'This fits the limits in your Wealth Policy.' };
  if (outcome === 'REQUIRES_APPROVAL') return { title: 'Requires your approval', detail: 'This action fits your policy, but needs your confirmation.' };
  return { title: 'Blocked by your Wealth Policy', detail: 'This action cannot be prepared.' };
}

function friendlyReason(code: string) {
  const labels: Record<string, string> = {
    PRICE_UNAVAILABLE: 'We couldn’t verify a current price for this asset.',
    ASSET_NOT_ALLOWED: 'This asset is not included in your Wealth Policy.',
    ASSET_EXCLUDED: 'Your Wealth Policy excludes this asset.',
    PROTOCOL_NOT_ALLOWED: 'This destination is not approved by your Wealth Policy.',
    TRANSACTION_LIMIT_EXCEEDED: 'This amount is above your transaction limit.',
    ASSET_CONCENTRATION_EXCEEDED: 'This would put too much of your portfolio in one asset.',
    LIQUIDITY_RESERVE_BREACHED: 'This would take your liquid reserve below its limit.',
    AUTONOMY_LIMIT_EXCEEDED: 'This amount needs your approval before it can proceed.',
  };
  return labels[code] ?? 'This action does not meet your Wealth Policy.';
}

function lifecycleCopy(status: PlanExecution['status']) {
  const labels: Record<PlanExecution['status'], Readonly<{ title: string; detail: string }>> = {
    preparing: { title: 'Preparing action', detail: 'Checking the details against your account.' },
    executing: { title: 'Executing action', detail: 'Your account is submitting the approved action.' },
    confirming: { title: 'Confirming result', detail: 'Waiting for the network confirmation.' },
    completed: { title: 'Completed', detail: 'Your portfolio has been refreshed.' },
    failed: { title: 'Couldn’t complete this action', detail: 'No portfolio change was confirmed.' },
  };
  return labels[status];
}

function humanizePlanText(value: string) {
  return value.replaceAll('aave-v3', 'Aave V3').replaceAll('avalanche-fuji', 'Avalanche Fuji');
}

export function ExecutionPlan({ plan, status, evaluations = [], executions = {}, authority, onExecute, onRetry }: {
  plan: ActionPlan;
  status: PlanStatus;
  evaluations?: readonly PlanPolicyEvaluation[];
  executions?: Readonly<Record<number, PlanExecution>>;
  authority?: PlanExecutionAuthority;
  onExecute?: (evaluation: PlanPolicyEvaluation) => void;
  onRetry?: (evaluation: PlanPolicyEvaluation) => void;
}) {
  const hasCompletedAction = Object.values(executions).some((execution) => execution.status === 'completed');
  return <section className="planning-result" aria-label="Action plan"><div className="planning-result-heading"><div><small>SUGGESTED ACTION</small><h2>{humanizePlanText(plan.summary)}</h2></div><span className={`planning-status ${status}`}>{status === 'blocked' ? 'Blocked' : status === 'ready' ? 'Review needed' : 'Ready'}</span></div><p className="planning-reason"><b>Why this may help</b>{humanizePlanText(plan.reasoning)}</p><ol className="planning-steps">{plan.steps.map((step, index) => <li key={`${index}-${step}`}><span>{index + 1}</span><span>{humanizePlanText(step)}</span></li>)}</ol>{plan.proposedActions.map((action, index) => {
    const evaluation = evaluations.find((item) => item.actionIndex === index);
    const execution = executions[index];
    const policy = evaluation ? policyCopy(evaluation.outcome) : null;
    const canExecute = evaluation && evaluation.outcome !== 'BLOCKED' && evaluation.actionId && !execution;
    const lifecycle = execution ? lifecycleCopy(execution.status) : null;
    return <div className="planning-action" key={index}><div className="planning-action-heading"><strong>{action.type === 'SUPPLY' ? 'Supply USDC' : action.type}</strong><span>{action.amount} USDC</span></div><dl className="planning-action-details"><div><dt>Amount</dt><dd>{action.amount} USDC</dd></div><div><dt>Destination</dt><dd>{action.protocol === 'aave-v3' ? 'Aave V3' : action.protocol}</dd></div></dl>{evaluation && policy && <div className={`planning-policy-decision ${evaluation.outcome.toLowerCase()}`}><b>{policy.title}</b><span>{policy.detail}</span>{evaluation.outcome === 'BLOCKED' && evaluation.reasons.length > 0 && <ul>{evaluation.reasons.map((reason, reasonIndex) => <li key={`${reason.code}-${reasonIndex}`}>{friendlyReason(reason.code)}</li>)}</ul>}{evaluation.outcome === 'BLOCKED' && <Link className="planning-review-policy" href="/strategy">Review policy</Link>}</div>}{canExecute && <button type="button" className="planning-execute" onClick={() => onExecute?.(evaluation)}>{evaluation.outcome === 'REQUIRES_APPROVAL' ? 'Confirm and execute' : 'Execute'}</button>}{execution && lifecycle && <div className={`planning-execution ${execution.status}`}><b>{lifecycle.title}</b><span>{execution.status === 'failed' && execution.failureReason ? execution.failureReason : lifecycle.detail}</span>{execution.status === 'completed' && execution.portfolio && <div className="planning-completion"><strong>Supplied {action.amount} USDC to Aave V3</strong><span>USDC supplied: {execution.portfolio.suppliedUsdc}</span><span>USDC in wallet: {execution.portfolio.walletUsdc}</span></div>}{execution.status === 'failed' && execution.retryable && <button type="button" className="planning-retry" onClick={() => onRetry?.(evaluation!)}>Try again</button>}{execution.status === 'completed' && <details><summary>View details</summary><p>Network: Avalanche Fuji</p>{execution.reference && <code>Transaction: {execution.reference}</code>}</details>}</div>}</div>;
  })}<p className="planning-disclaimer">{hasCompletedAction ? 'Completed actions are reflected in your current portfolio.' : 'Nothing is executed until you choose to continue.'}</p></section>;
}
