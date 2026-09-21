import { ArrowRight, CheckCircle2, Info, Settings2 } from 'lucide-react';
import type { PolicyChangeView } from '../chat-types';

export function PolicyChangeCard({
  change,
  pending,
  onApply,
  onCancel,
}: {
  change: PolicyChangeView;
  pending: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  const proposed = change.proposedMinimumLiquidStableReservePercent;
  return (
    <section
      className="chat-response-card chat-policy-change-card"
      aria-label="Policy change proposal"
    >
      <div className="chat-response-kicker">
        <Settings2 aria-hidden="true" />
        <span>Policy change</span>
      </div>
      <h2>Minimum liquid reserve</h2>
      <div className="chat-policy-change-values">
        <div>
          <strong>{change.currentMinimumLiquidStableReservePercent}%</strong>
          <span>Current setting</span>
        </div>
        <ArrowRight aria-hidden="true" />
        <div className="proposed">
          <strong>{proposed}%</strong>
          <span>Proposed setting</span>
        </div>
      </div>
      <p>WealthBuilder will keep more of your portfolio liquid before deploying capital.</p>
      <div className="chat-policy-change-effect">
        <Info aria-hidden="true" />
        <span>
          Fewer actions will execute automatically, while more stablecoin stays accessible.
        </span>
      </div>
      {change.state === 'applied' ? (
        <p className="chat-policy-change-applied">
          <CheckCircle2 aria-hidden="true" />
          Your Wealth Policy has been updated.
        </p>
      ) : (
        <div className="chat-policy-change-actions">
          <button
            type="button"
            className="chat-primary-action"
            onClick={onApply}
            disabled={pending}
          >
            {pending ? 'Applying…' : 'Apply change'}
          </button>
          <button
            type="button"
            className="chat-secondary-action"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}
