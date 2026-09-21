import { CheckCircle2, CircleAlert, ShieldX } from 'lucide-react';
import Link from 'next/link';
import type { PlanPolicyEvaluation } from '@/presentation/planning/ExecutionPlan';
import { policyReason } from './response-utils';

export function PolicyDecision({ evaluation }: { evaluation: PlanPolicyEvaluation }) {
  const state =
    evaluation.outcome === 'AUTONOMOUS_ALLOWED'
      ? 'allowed'
      : evaluation.outcome === 'REQUIRES_APPROVAL'
        ? 'approval'
        : 'blocked';
  const Icon = state === 'allowed' ? CheckCircle2 : state === 'approval' ? CircleAlert : ShieldX;
  const title =
    state === 'allowed'
      ? 'Allowed automatically'
      : state === 'approval'
        ? 'Approval required'
        : 'Blocked by your Wealth Policy';
  const detail =
    state === 'allowed'
      ? 'This fits the limits in your active policy.'
      : state === 'approval'
        ? 'This fits your policy, and needs your confirmation.'
        : null;

  return (
    <section className={`chat-policy-decision ${state}`} aria-label={`Policy decision: ${title}`}>
      <div className="chat-policy-decision-title">
        <Icon aria-hidden="true" />
        <div>
          <strong>{title}</strong>
          {detail && <span>{detail}</span>}
        </div>
      </div>
      {state === 'blocked' && (
        <>
          <ul>
            {evaluation.reasons.map((reason, index) => (
              <li key={`${reason.code}-${index}`}>{policyReason(reason.code)}</li>
            ))}
          </ul>
          <Link href="/strategy" className="chat-review-policy">
            Review policy
          </Link>
        </>
      )}
    </section>
  );
}
