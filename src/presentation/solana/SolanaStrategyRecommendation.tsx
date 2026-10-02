'use client';

import { ArrowLeft, ArrowRight, Check, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
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
      <h1 id="solana-strategy-title">Put your SOL to work.</h1>
      <p className="solana-match-intro">
        A strategy selected for your goals, timeline, and comfort with risk.
      </p>
      {opportunity.isDevelopmentFixture && (
        <p className="solana-development-fixture" role="status">
          Development fixture — no live protocol action is available.
        </p>
      )}
      <section className="solana-opportunity-card" aria-label="Recommended opportunity">
        <p>WealthBuilder recommends</p>
        <h2>Put your SOL to work</h2>
        <strong>
          {opportunity.protocol} · {opportunity.name}
        </strong>
        <div className="solana-opportunity-facts">
          <span>WealthBuilder: {formatRisk(opportunity.riskLevel)}</span>
          <span>{formatLiquidity(opportunity.liquidity)} access</span>
          <span>{opportunity.leverage ? 'Uses borrowing' : 'No borrowing or leverage'}</span>
        </div>
      </section>
      <section className="solana-allocation-card" aria-label="Recommended allocation">
        <span>Amount to put to work</span>
        <strong>{allocationPercent}%</strong>
        <p>
          ≈ {formatSol(allocationAmount(balanceLamports, allocationPercent))} SOL from your wallet
        </p>
      </section>
      <section className="solana-explanation" aria-labelledby="solana-why-title">
        <h2 id="solana-why-title">Why it fits you</h2>
        {explanation ? (
          <>
            <h3>{explanation.headline}</h3>
            <p>{explanation.summary}</p>
            <ul>
              {(explanation.whyThisFits ?? explanation.reasons ?? []).map((reason) => (
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
        <h2>Built around your boundaries</h2>
        <p>{deterministicReasons.at(-1)}</p>
      </section>
      <OtherStrategyPreviews />
      <button type="button" className="solana-primary-action" onClick={onReview}>
        Review your strategy <ArrowRight size={18} aria-hidden="true" />
      </button>
      <button type="button" className="solana-text-button" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" /> Edit preferences
      </button>
    </section>
  );
}

function OtherStrategyPreviews() {
  return (
    <section className="solana-other-strategies" aria-labelledby="solana-other-strategies-title">
      <div>
        <p className="solana-overline">Other strategies</p>
        <h2 id="solana-other-strategies-title">More matches, coming next.</h2>
      </div>
      <article className="solana-strategy-preview">
        <div>
          <h3>Stablecoin lending</h3>
          <p>Medium risk · Liquid · Lending</p>
        </div>
        <button type="button" disabled>
          Coming next
        </button>
      </article>
      <article className="solana-strategy-preview">
        <div>
          <h3>Leveraged yield strategy</h3>
          <p>High risk · Borrowing, leverage, and liquidation exposure</p>
        </div>
        <button type="button" disabled>
          Preview
        </button>
      </article>
      <p className="solana-preview-disclaimer">Previews only — not currently executable.</p>
    </section>
  );
}

export function SolanaOpportunityReview({
  result,
  balanceLamports,
  executionStage,
  executionError,
  onStake,
  onBack,
}: {
  result: SolanaStrategyResult;
  balanceLamports: bigint;
  executionStage:
    | 'preparing'
    | 'awaiting-approval'
    | 'submitted'
    | 'confirming'
    | 'confirmed'
    | 'rejected'
    | 'failed'
    | null;
  executionError: string;
  onStake: () => void;
  onBack: () => void;
}) {
  const recommendation = result.recommendation;
  if (!recommendation) return null;
  const { opportunity, allocationPercent } = recommendation;
  const isJitoSol = opportunity.id === 'jito-sol-liquid-staking';
  const executionLabel =
    executionStage === 'preparing'
      ? 'Preparing your strategy'
      : executionStage === 'awaiting-approval'
        ? 'Waiting for your approval'
        : executionStage === 'submitted'
          ? 'Sent to Solana'
          : executionStage === 'confirming'
            ? 'Confirming your strategy'
            : executionStage === 'confirmed'
              ? 'Strategy confirmed'
              : executionStage === 'rejected'
                ? 'Wallet approval rejected'
                : executionStage === 'failed'
                  ? 'Transaction failed'
                  : null;
  const actionInFlight =
    executionStage === 'preparing' ||
    executionStage === 'awaiting-approval' ||
    executionStage === 'submitted' ||
    executionStage === 'confirming';
  return (
    <section className="solana-opportunity-review" aria-labelledby="solana-review-title">
      <p className="solana-overline">Review your strategy</p>
      <h1 id="solana-review-title">Ready to put your SOL to work?</h1>
      <section className="solana-review-product" aria-label="Selected opportunity">
        <span>Selected strategy</span>
        <h2>Put your SOL to work</h2>
        <p>
          {opportunity.protocol} · {opportunity.name}
        </p>
      </section>
      <dl className="solana-review-facts">
        <div>
          <dt>Proposed allocation</dt>
          <dd>{allocationPercent}%</dd>
        </div>
        <div>
          <dt>Approximate amount</dt>
          <dd>≈ {formatSol(allocationAmount(balanceLamports, allocationPercent))} SOL</dd>
        </div>
        <div>
          <dt>Risk</dt>
          <dd>{formatRisk(opportunity.riskLevel)}</dd>
        </div>
        <div>
          <dt>Liquidity</dt>
          <dd>{formatLiquidity(opportunity.liquidity)} access</dd>
        </div>
        <div>
          <dt>Borrowing</dt>
          <dd>{opportunity.leverage ? 'Included' : 'None'}</dd>
        </div>
      </dl>
      <section className="solana-control-note">
        <h2>What happens next</h2>
        <p>
          We’ll put part of your SOL into Jito’s liquid staking strategy. Your wallet will receive
          JitoSOL in return.
        </p>
      </section>
      <section className="solana-approval-note" aria-label="Approval control">
        <ShieldCheck size={19} aria-hidden="true" />
        <div>
          <strong>You approve before anything happens.</strong>
          <span>WealthBuilder cannot move funds without your wallet signature.</span>
        </div>
      </section>
      {isJitoSol ? (
        <>
          <button
            type="button"
            className="solana-primary-action"
            onClick={onStake}
            disabled={actionInFlight}
          >
            {actionInFlight
              ? executionLabel
              : executionStage
                ? 'Try again'
                : `Put ${allocationPercent}% to work`}{' '}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          {executionLabel && (
            <p className="solana-execution-status" role="status">
              {actionInFlight && (
                <RefreshCw size={16} className="solana-loading-icon" aria-hidden="true" />
              )}
              {executionLabel}
            </p>
          )}
          {executionError && (
            <p className="solana-flow-error" role="alert">
              {executionError}
            </p>
          )}
        </>
      ) : (
        <p className="solana-flow-error">This opportunity does not have an execution path yet.</p>
      )}
      <button type="button" className="solana-text-button" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" /> Back to strategy
      </button>
    </section>
  );
}

export function SolanaStrategyActive({
  depositedLamports,
  signature,
  remainingSolLamports,
  jitoSolLamports,
  refreshMessage,
  onPortfolio,
}: {
  depositedLamports: bigint;
  signature: string;
  remainingSolLamports: bigint | null;
  jitoSolLamports: bigint | null;
  refreshMessage: string | null;
  onPortfolio: () => void;
}) {
  const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  return (
    <section className="solana-strategy-active" aria-labelledby="solana-active-title">
      <span className="solana-active-mark">
        <Check size={24} aria-hidden="true" />
      </span>
      <p className="solana-overline">Strategy active</p>
      <h1 id="solana-active-title">Your strategy is active.</h1>
      <section className="solana-active-product">
        <span>Strategy details</span>
        <h2>JitoSOL liquid staking</h2>
        <p>Jito · Confirmed</p>
      </section>
      <dl className="solana-active-facts">
        <div>
          <dt>Allocated</dt>
          <dd>{formatSol(depositedLamports)} SOL</dd>
        </div>
        <div>
          <dt>Your JitoSOL position</dt>
          <dd>
            {jitoSolLamports === null ? 'Unavailable' : `${formatSol(jitoSolLamports)} JitoSOL`}
          </dd>
        </div>
        <div>
          <dt>SOL remaining</dt>
          <dd>
            {remainingSolLamports === null
              ? 'Refreshing…'
              : `${formatSol(remainingSolLamports)} SOL`}
          </dd>
        </div>
      </dl>
      {refreshMessage && <p className="solana-refresh-warning">{refreshMessage}</p>}
      <a href={explorerUrl} target="_blank" rel="noreferrer" className="solana-transaction-link">
        View transaction <ExternalLink size={15} aria-hidden="true" />
      </a>
      <section className="solana-control-note">
        <h2>You stay in control</h2>
        <p>Your wallet remains self-custodial. Future actions require your approval.</p>
      </section>
      <button type="button" className="solana-primary-action" onClick={onPortfolio}>
        Back to portfolio <ArrowRight size={18} aria-hidden="true" />
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

function formatRisk(value: string) {
  return value[0] + value.slice(1).toLowerCase();
}

function formatLiquidity(value: string) {
  return value[0] + value.slice(1).toLowerCase();
}
