import { Check, ChevronDown, FileText, Info } from 'lucide-react';
import type { ActionPlan } from '@/domain';
import type { PlanExecution } from '@/presentation/planning/ExecutionPlan';
import { actionTitle, formatUsdcAmount } from './response-utils';

export function ExecutionSuccess({
  action,
  execution,
}: {
  action: ActionPlan['proposedActions'][number];
  execution: PlanExecution;
}) {
  const amount = Number(action.amount);
  const afterWallet = Number(formatUsdcAmount(execution.portfolio?.walletUsdc ?? '0'));
  const afterSupplied = Number(formatUsdcAmount(execution.portfolio?.suppliedUsdc ?? '0'));
  return (
    <section className="chat-response-card chat-execution-success" aria-label="Completed action">
      <div className="chat-success-heading">
        <span>
          <Check aria-hidden="true" />
        </span>
        <div>
          <small>Transaction successful</small>
          <h2>{actionTitle(action)}</h2>
        </div>
      </div>
      <p>Your portfolio has been refreshed and reflects the new position.</p>
      <div className="chat-balance-table">
        <div className="chat-balance-heading">
          <span />
          <span>Before</span>
          <span>After</span>
        </div>
        <div>
          <span>Wallet USDC</span>
          <strong>{afterWallet + amount}</strong>
          <strong>{afterWallet}</strong>
        </div>
        <div>
          <span>Supplied USDC</span>
          <strong>{Math.max(0, afterSupplied - amount)}</strong>
          <strong>{afterSupplied}</strong>
        </div>
      </div>
      <p className="chat-card-footnote">
        <Info aria-hidden="true" />
        Portfolio state refreshed after confirmation.
      </p>
      <details className="chat-execution-details">
        <summary>
          <FileText aria-hidden="true" />
          View details
          <ChevronDown aria-hidden="true" />
        </summary>
        <p>Network: Avalanche Fuji</p>
        {execution.reference && <code>Transaction: {execution.reference}</code>}
      </details>
    </section>
  );
}
