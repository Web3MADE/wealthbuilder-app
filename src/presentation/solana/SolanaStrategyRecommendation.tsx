'use client';

import { ArrowLeft, ArrowRight, Check, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { SolanaStrategyResult } from '@/application/solana-strategy-service';

export function SolanaStrategyRecommendation({
  result,
  balanceLamports,
  retrying,
  onRetry,
  onReview,
  onBack,
}: {
  result: SolanaStrategyResult;
  balanceLamports: bigint;
  retrying: boolean;
  onRetry: () => void;
  onReview: () => void;
  onBack: () => void;
}) {
  if (!result.recommendation) {
    return (
      <section className="solana-strategy-unavailable" aria-labelledby="solana-no-match-title">
        <p className="solana-overline">Your strategy</p>
        <h1 id="solana-no-match-title">No match is available yet.</h1>
        <p>{result.reasons[0]}</p>
        <button
          type="button"
          className="solana-secondary-action"
          onClick={onRetry}
          disabled={retrying}
        >
          <RefreshCw size={18} aria-hidden="true" /> Try again
        </button>
        <button type="button" className="solana-text-button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Edit preferences
        </button>
      </section>
    );
  }

  const { opportunity, allocationPercent, deterministicReasons, explanation, explanationError } =
    result.recommendation;
  return (
    <section className="solana-strategy-recommendation" aria-labelledby="solana-strategy-title">
      <p className="solana-overline">Your strategy</p>
      <h1 id="solana-strategy-title">Your best available match.</h1>
      {opportunity.isDevelopmentFixture && (
        <p className="solana-development-fixture" role="status">
          Development fixture — no live protocol action is available.
        </p>
      )}
      <section className="solana-opportunity-card" aria-label="Recommended opportunity">
        <p>Recommended opportunity</p>
        <h2>{opportunity.name}</h2>
        <strong>{opportunity.protocol}</strong>
        <div className="solana-opportunity-facts">
          <span>{formatCategory(opportunity.category)}</span>
          <span>{formatRisk(opportunity.riskLevel)} risk</span>
          <span>{formatLiquidity(opportunity.liquidity)} liquidity</span>
        </div>
      </section>
      <section className="solana-allocation-card" aria-label="Recommended allocation">
        <span>Recommended allocation</span>
        <strong>{allocationPercent}%</strong>
        <p>
          of your SOL · up to {formatSol(allocationAmount(balanceLamports, allocationPercent))} SOL
        </p>
      </section>
      <section className="solana-explanation" aria-labelledby="solana-why-title">
        <h2 id="solana-why-title">Why it fits you</h2>
        {explanation ? (
          <>
            <h3>{explanation.headline}</h3>
            <p>{explanation.summary}</p>
            <ul>
              {explanation.reasons.map((reason) => (
                <li key={reason}>
                  <Check size={16} aria-hidden="true" /> {reason}
                </li>
              ))}
            </ul>
            <p className="solana-risk-note">{explanation.riskNote}</p>
          </>
        ) : (
          <div className="solana-explanation-unavailable">
            <p>{explanationError}</p>
            <button
              type="button"
              className="solana-text-button"
              onClick={onRetry}
              disabled={retrying}
            >
              <RefreshCw size={15} aria-hidden="true" /> Retry explanation
            </button>
          </div>
        )}
      </section>
      <section className="solana-control-note" aria-label="Your control">
        <h2>You stay in control</h2>
        <p>{deterministicReasons.at(-1)}</p>
      </section>
      <button type="button" className="solana-primary-action" onClick={onReview}>
        Review opportunity <ArrowRight size={18} aria-hidden="true" />
      </button>
      <button type="button" className="solana-text-button" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" /> Edit preferences
      </button>
    </section>
  );
}

export function SolanaOpportunityReview({
  result,
  balanceLamports,
  onBack,
}: {
  result: SolanaStrategyResult;
  balanceLamports: bigint;
  onBack: () => void;
}) {
  const [notice, setNotice] = useState('');
  const recommendation = result.recommendation;
  if (!recommendation) return null;
  const { opportunity, allocationPercent } = recommendation;
  return (
    <section className="solana-opportunity-review" aria-labelledby="solana-review-title">
      <p className="solana-overline">Review opportunity</p>
      <h1 id="solana-review-title">Review before any action.</h1>
      <dl className="solana-review-facts">
        <div>
          <dt>Protocol</dt>
          <dd>{opportunity.protocol}</dd>
        </div>
        <div>
          <dt>Opportunity</dt>
          <dd>{opportunity.name}</dd>
        </div>
        <div>
          <dt>Allocation</dt>
          <dd>{allocationPercent}% of SOL</dd>
        </div>
        <div>
          <dt>Approximate amount</dt>
          <dd>{formatSol(allocationAmount(balanceLamports, allocationPercent))} SOL</dd>
        </div>
        <div>
          <dt>Risk</dt>
          <dd>{formatRisk(opportunity.riskLevel)}</dd>
        </div>
        <div>
          <dt>Liquidity</dt>
          <dd>{formatLiquidity(opportunity.liquidity)}</dd>
        </div>
      </dl>
      <section className="solana-control-note">
        <h2>What happens next</h2>
        <p>
          When a supported protocol path is configured, WealthBuilder will prepare this opportunity
          for your explicit approval. No transaction will be sent now.
        </p>
      </section>
      <button
        type="button"
        className="solana-primary-action"
        onClick={() => setNotice('This opportunity is ready for the next execution milestone.')}
      >
        Continue <ArrowRight size={18} aria-hidden="true" />
      </button>
      {notice && (
        <p className="solana-flow-notice" role="status">
          {notice}
        </p>
      )}
      <button type="button" className="solana-text-button" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" /> Back to strategy
      </button>
    </section>
  );
}

function allocationAmount(balanceLamports: bigint, allocationPercent: number) {
  return (balanceLamports * BigInt(allocationPercent)) / 100n;
}

function formatSol(lamports: bigint) {
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function formatCategory(value: string) {
  return value[0] + value.slice(1).toLowerCase();
}

function formatRisk(value: string) {
  return value[0] + value.slice(1).toLowerCase();
}

function formatLiquidity(value: string) {
  return value[0] + value.slice(1).toLowerCase();
}
