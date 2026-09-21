import { ArrowUpRight, Droplets, PieChart, WalletCards } from 'lucide-react';
import type { FujiPortfolioView } from '@/presentation/wealth/use-fuji-portfolio';
import { formatUsd } from '@/presentation/wealth/use-fuji-portfolio';

function percent(value: bigint, total: bigint) {
  return total === 0n ? 0 : Number((value * 10_000n) / total) / 100;
}

export function InsightCard({
  portfolio,
  interpretation,
}: {
  portfolio: FujiPortfolioView;
  interpretation: string;
}) {
  const total = BigInt(portfolio.totalUsdMicros);
  const liquid = portfolio.positions
    .filter((position) => position.location === 'WALLET')
    .reduce((sum, position) => sum + BigInt(position.valueUsdMicros), 0n);
  const deployed = total - liquid;

  return (
    <section className="chat-response-card chat-insight-card" aria-label="Portfolio insight">
      <div className="chat-response-kicker">
        <PieChart aria-hidden="true" />
        <span>Portfolio insight</span>
      </div>
      <h2>
        {total > 0n
          ? 'Your portfolio is ready to review'
          : 'Your portfolio has no priced positions yet'}
      </h2>
      <p>{interpretation}</p>
      <div className="chat-insight-metrics">
        <div>
          <WalletCards aria-hidden="true" />
          <span>Total value</span>
          <strong>{formatUsd(portfolio.totalUsdMicros)}</strong>
        </div>
        <div>
          <Droplets aria-hidden="true" />
          <span>Liquid</span>
          <strong>{percent(liquid, total)}%</strong>
        </div>
        <div>
          <ArrowUpRight aria-hidden="true" />
          <span>Deployed</span>
          <strong>{percent(deployed, total)}%</strong>
        </div>
      </div>
    </section>
  );
}
