import { Bot, Droplets, Layers3, ShieldCheck, TrendingUp, WalletCards } from 'lucide-react';
import type { ActivePolicyView } from '@/presentation/wealth/use-active-policy';
import { formatPolicyUsd } from '@/presentation/wealth/use-active-policy';

export function PolicySummaryCard({ policy }: { policy: ActivePolicyView }) {
  const rows = [
    [TrendingUp, 'Risk', policy.riskLevel],
    [Droplets, 'Minimum liquid reserve', `${policy.minimumLiquidReservePercent}%`],
    [Layers3, 'Max asset concentration', `${policy.maxAssetConcentrationPercent}%`],
    [
      WalletCards,
      'Transaction limits',
      `${formatPolicyUsd(policy.autonomyLimitUsd)} auto / ${formatPolicyUsd(policy.transactionLimitUsd)} max`,
    ],
    [Layers3, 'Allowed protocols', policy.allowedProtocols.join(', ')],
    [Bot, 'AI autonomy', policy.autonomyEnabled ? 'Auto within limits' : 'Approval required'],
  ] as const;

  return (
    <section className="chat-response-card chat-policy-summary" aria-label="Current Wealth Policy">
      <div className="chat-policy-summary-heading">
        <span>
          <ShieldCheck aria-hidden="true" />
        </span>
        <div>
          <h2>Current Wealth Policy</h2>
          <p>These settings guide how WealthBuilder manages your portfolio.</p>
        </div>
      </div>
      <dl>
        {rows.map(([Icon, label, value]) => (
          <div key={label}>
            <dt>
              <Icon aria-hidden="true" />
              {label}
            </dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="chat-card-footnote">
        You stay in control. WealthBuilder only acts within these boundaries.
      </p>
    </section>
  );
}
