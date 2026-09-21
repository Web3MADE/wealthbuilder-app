import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { PlanExecution } from '@/presentation/planning/ExecutionPlan';

export function ExecutionFailure({
  execution,
  onRetry,
}: {
  execution: PlanExecution;
  onRetry: () => void;
}) {
  return (
    <section
      className="chat-response-card chat-execution-failure"
      aria-label="Action execution failed"
    >
      <div className="chat-response-kicker">
        <AlertTriangle aria-hidden="true" />
        <span>Action not completed</span>
      </div>
      <h2>We couldn’t complete this action</h2>
      <p>{execution.failureReason ?? 'Your portfolio was not changed.'}</p>
      {execution.retryable && (
        <button type="button" className="chat-secondary-action" onClick={onRetry}>
          <RotateCcw aria-hidden="true" />
          Try again
        </button>
      )}
    </section>
  );
}
