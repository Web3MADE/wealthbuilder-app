import Link from 'next/link';
import { ArrowRight, PieChart, Settings, ShieldCheck } from 'lucide-react';
import { formatPolicyUsd, type ActivePolicyView } from '@/presentation/wealth/use-active-policy';

export function HomePolicyCard({ policy }: { policy: ActivePolicyView | null }) {
  return (
    <section className="home-card home-policy" id="policy">
      <div className="home-card-heading">
        <h2>Your Wealth Policy</h2>
        <span>{policy ? `Active · v${policy.version}` : 'Loading…'}</span>
      </div>
      <div className="home-policy-list">
        <div>
          <ShieldCheck size={17} />
          <span>Risk level</span>
          <strong>{policy?.riskLevel ?? '…'}</strong>
        </div>
        <div>
          <PieChart size={17} />
          <span>Asset concentration</span>
          <strong>{policy ? `Up to ${policy.maxAssetConcentrationPercent}%` : '…'}</strong>
        </div>
        <div>
          <ShieldCheck size={17} />
          <span>Liquidity reserve</span>
          <strong>{policy ? `${policy.minimumLiquidReservePercent}% minimum` : '…'}</strong>
        </div>
        <div>
          <Settings size={17} />
          <span>AI autonomy</span>
          <strong>
            {policy
              ? policy.autonomyEnabled
                ? `Up to ${formatPolicyUsd(policy.autonomyLimitUsd)}`
                : 'Approval required'
              : '…'}
          </strong>
        </div>
      </div>
      <Link className="home-policy-link" href="/strategy">
        Review policy <ArrowRight size={18} />
      </Link>
    </section>
  );
}

export function HomeMobilePolicyCard({ policy }: { policy: ActivePolicyView | null }) {
  return (
    <Link className="home-mobile-policy home-card" href="/strategy">
      <span className="home-mobile-policy-icon">
        <ShieldCheck size={24} />
      </span>
      <span>
        <strong>Your Wealth Policy</strong>
        <small>
          {policy
            ? `${policy.riskLevel} risk · ${policy.minimumLiquidReservePercent}% liquid · ${policy.allowedProtocols.join(', ')} approved`
            : 'Loading your active policy…'}
        </small>
      </span>
      <b>{policy ? `Active · v${policy.version}` : '…'}</b>
      <span className="home-mobile-policy-arrow">›</span>
    </Link>
  );
}
