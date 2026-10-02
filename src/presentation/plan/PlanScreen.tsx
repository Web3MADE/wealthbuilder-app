'use client';

import { ArrowRight, Check, CircleAlert, Sparkles } from 'lucide-react';
import { useState } from 'react';
import styles from './PlanScreen.module.css';

type Goal = 'long-term-wealth' | 'preserve-crypto' | 'growth';
type Timeline = '1-3-years' | '3-5-years' | '5-plus-years';
type Risk = 'conservative' | 'balanced' | 'growth';
type Source = 'wallet' | 'example';
type ExamplePreset = 'sol-heavy' | 'stablecoin-saver' | 'diversified-crypto';

type PlanResponse = Readonly<{
  portfolio: Readonly<{
    source: Source;
    label?: string;
    walletAddress?: string;
    solBalance: string;
    solUsdValue: number | null;
    topTokenHoldings: readonly Readonly<{
      name: string;
      symbol: string;
      amount: string;
      usdValue: number | null;
    }>[];
    approximateTotalUsdValue: number | null;
    isPartial: boolean;
  }>;
  preferences: Readonly<{ goal: Goal; timeline: Timeline; risk: Risk }>;
  recommendation: Readonly<{
    opportunity: Readonly<{
      protocol: string;
      name: string;
      riskLevel: string;
      liquidity: string;
      leverage: boolean;
    }>;
    allocationPercent: number;
    allocationAsset: 'SOL' | 'STABLECOIN';
    approximateSolAllocationLamports: string | null;
    deterministicReasons: readonly string[];
    explanation: Readonly<{
      headline: string;
      summary: string;
      reasons: readonly string[];
      riskNote: string;
    }> | null;
  }> | null;
  reasons: readonly string[];
  ruledOut: string;
}>;

const goalOptions = [
  { value: 'long-term-wealth', label: 'Build long-term wealth' },
  { value: 'preserve-crypto', label: 'Preserve my crypto' },
  { value: 'growth', label: 'Grow more aggressively' },
] as const satisfies readonly Readonly<{ value: Goal; label: string }>[];

const timelineOptions = [
  { value: '1-3-years', label: '1–3 years' },
  { value: '3-5-years', label: '3–5 years' },
  { value: '5-plus-years', label: '5+ years' },
] as const satisfies readonly Readonly<{ value: Timeline; label: string }>[];

const riskOptions = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'growth', label: 'Growth' },
] as const satisfies readonly Readonly<{ value: Risk; label: string }>[];

const exampleOptions = [
  {
    value: 'sol-heavy',
    label: 'SOL-heavy holder',
    detail: 'Mostly SOL, ready to put a portion to work.',
  },
  {
    value: 'stablecoin-saver',
    label: 'Stablecoin-heavy saver',
    detail: 'A cautious mix of USDC and USDT.',
  },
  {
    value: 'diversified-crypto',
    label: 'Diversified crypto holder',
    detail: 'SOL, stablecoins, and ecosystem tokens.',
  },
] as const satisfies readonly Readonly<{
  value: ExamplePreset;
  label: string;
  detail: string;
}>[];

export function PlanScreen() {
  const [source, setSource] = useState<Source>('wallet');
  const [walletAddress, setWalletAddress] = useState('');
  const [examplePreset, setExamplePreset] = useState<ExamplePreset>('sol-heavy');
  const [goal, setGoal] = useState<Goal>('long-term-wealth');
  const [timeline, setTimeline] = useState<Timeline>('5-plus-years');
  const [risk, setRisk] = useState<Risk>('balanced');
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function buildPlan() {
    setError('');
    setResult(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source, walletAddress, examplePreset, goal, timeline, risk }),
      });
      const data = (await response.json()) as PlanResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'We could not build your plan right now.');
      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'We could not build your plan right now.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a href="/plan" className={styles.brand} aria-label="WealthBuilder plan">
            <span>W</span> WealthBuilder
          </a>
          <p>Mainnet read-only</p>
        </header>

        {!result ? (
          <section className={styles.intro} aria-labelledby="plan-title">
            <p className={styles.eyebrow}>Your personal wealth plan</p>
            <h1 id="plan-title">See what your crypto could be doing for you.</h1>
            <p className={styles.lede}>
              Tell WealthBuilder what you own and what you&apos;re trying to achieve. Get a
              personalized plan in seconds.
            </p>
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void buildPlan();
              }}
            >
              <div className={styles.sourceSwitch} aria-label="Portfolio source">
                <button
                  type="button"
                  className={source === 'wallet' ? styles.sourceActive : undefined}
                  onClick={() => setSource('wallet')}
                >
                  Use my Solana wallet
                </button>
                <button
                  type="button"
                  className={source === 'example' ? styles.sourceActive : undefined}
                  onClick={() => setSource('example')}
                >
                  Try an example portfolio
                </button>
              </div>
              {source === 'wallet' ? (
                <label className={styles.addressField}>
                  <span>Your Solana wallet</span>
                  <input
                    value={walletAddress}
                    onChange={(event) => setWalletAddress(event.target.value)}
                    placeholder="Paste your public wallet address"
                    autoComplete="off"
                    spellCheck="false"
                    required
                  />
                </label>
              ) : (
                <fieldset className={styles.examples}>
                  <legend>Choose an example</legend>
                  {exampleOptions.map((option) => (
                    <label key={option.value} className={styles.exampleOption}>
                      <input
                        type="radio"
                        name="example-portfolio"
                        value={option.value}
                        checked={examplePreset === option.value}
                        onChange={() => setExamplePreset(option.value)}
                      />
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.detail}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
              <PlanSelect label="Your goal" value={goal} options={goalOptions} onChange={setGoal} />
              <PlanSelect
                label="Your timeline"
                value={timeline}
                options={timelineOptions}
                onChange={setTimeline}
              />
              <PlanSelect
                label="Your risk level"
                value={risk}
                options={riskOptions}
                onChange={setRisk}
              />
              <button type="submit" className={styles.primaryButton} disabled={isLoading}>
                {isLoading ? 'Building your plan…' : 'Build my plan'}
                {!isLoading && <ArrowRight size={18} aria-hidden="true" />}
              </button>
              {error && (
                <p className={styles.error} role="alert">
                  <CircleAlert size={16} aria-hidden="true" /> {error}
                </p>
              )}
            </form>
            <p className={styles.footnote}>
              {source === 'wallet'
                ? 'We only read your public wallet. Nothing is connected or moved.'
                : 'Example portfolios are illustrative and are not connected to a wallet.'}
            </p>
          </section>
        ) : (
          <PlanResult result={result} onStartOver={() => setResult(null)} />
        )}
      </div>
    </main>
  );
}

function PlanSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly Readonly<{ value: T; label: string }>[];
  onChange: (value: T) => void;
}) {
  return (
    <label className={styles.selectField}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PlanResult({ result, onStartOver }: { result: PlanResponse; onStartOver: () => void }) {
  const recommendation = result.recommendation;
  if (!recommendation) {
    return (
      <section className={styles.result} aria-labelledby="plan-result-title">
        <p className={styles.eyebrow}>Your WealthBuilder plan</p>
        <h1 id="plan-result-title">No fit is available yet.</h1>
        <p className={styles.lede}>{result.reasons[0]}</p>
        <button type="button" className={styles.secondaryButton} onClick={onStartOver}>
          Adjust my plan
        </button>
      </section>
    );
  }

  const allocation = recommendation.approximateSolAllocationLamports
    ? formatSol(BigInt(recommendation.approximateSolAllocationLamports))
    : null;
  const allocationLabel =
    recommendation.allocationAsset === 'SOL' ? 'your SOL' : 'your stablecoins';
  const explanationReasons =
    recommendation.explanation?.reasons ?? recommendation.deterministicReasons;
  return (
    <section className={styles.result} aria-labelledby="plan-result-title">
      <div className={styles.resultHeading}>
        <span className={styles.resultMark}>
          <Sparkles size={20} aria-hidden="true" />
        </span>
        <div>
          <p className={styles.eyebrow}>Your WealthBuilder plan</p>
          <h1 id="plan-result-title">Put your SOL to work.</h1>
        </div>
      </div>
      <PortfolioSummary portfolio={result.portfolio} />
      <section className={styles.profile} aria-label="Your goals">
        <span>What you&apos;re trying to achieve</span>
        <strong>{labelFor(goalOptions, result.preferences.goal)}</strong>
        <p>
          {labelFor(timelineOptions, result.preferences.timeline)} ·{' '}
          {labelFor(riskOptions, result.preferences.risk)} risk
        </p>
      </section>
      <section className={styles.recommendation} aria-label="Recommended strategy">
        <span>What fits</span>
        <h2>
          Put {recommendation.allocationPercent}% of {allocationLabel} to work
        </h2>
        {allocation && <strong>≈ {allocation} SOL</strong>}
        <p>
          {recommendation.opportunity.protocol} · {recommendation.opportunity.name}
        </p>
      </section>
      <section className={styles.why}>
        <h2>{recommendation.explanation?.headline ?? 'Why this fits you'}</h2>
        {recommendation.explanation && <p>{recommendation.explanation.summary}</p>}
        <ul>
          {explanationReasons.slice(0, 3).map((reason) => (
            <li key={reason}>
              <Check size={16} aria-hidden="true" /> {reason}
            </li>
          ))}
        </ul>
      </section>
      <dl className={styles.details}>
        <div>
          <dt>Risk</dt>
          <dd>{formatLabel(recommendation.opportunity.riskLevel)}</dd>
        </div>
        <div>
          <dt>Access</dt>
          <dd>{formatLabel(recommendation.opportunity.liquidity)}</dd>
        </div>
        <div>
          <dt>Borrowing</dt>
          <dd>{recommendation.opportunity.leverage ? 'Included' : 'None'}</dd>
        </div>
      </dl>
      <section className={styles.ruledOut}>
        <h2>What we ruled out</h2>
        <p>{result.ruledOut}</p>
      </section>
      <button type="button" className={styles.secondaryButton} onClick={onStartOver}>
        Build another plan
      </button>
    </section>
  );
}

function PortfolioSummary({ portfolio }: { portfolio: PlanResponse['portfolio'] }) {
  return (
    <section className={styles.holdings} aria-label="What you have">
      <span>What you have</span>
      {portfolio.source === 'example' && (
        <p className={styles.exampleBadge}>Example portfolio · {portfolio.label}</p>
      )}
      <strong>{portfolio.solBalance} SOL</strong>
      {portfolio.solUsdValue !== null && <p>{formatUsd(portfolio.solUsdValue)} in SOL</p>}
      {portfolio.walletAddress && (
        <p>{shortAddress(portfolio.walletAddress)} · Mainnet public snapshot</p>
      )}
      {portfolio.topTokenHoldings.length > 0 && (
        <ul className={styles.tokens}>
          {portfolio.topTokenHoldings.map((holding) => (
            <li key={`${holding.symbol}-${holding.amount}`}>
              <span>
                <strong>{holding.symbol}</strong> {holding.amount}
              </span>
              {holding.usdValue !== null && <b>{formatUsd(holding.usdValue)}</b>}
            </li>
          ))}
        </ul>
      )}
      {portfolio.approximateTotalUsdValue !== null && (
        <p>Available snapshot: ≈ {formatUsd(portfolio.approximateTotalUsdValue)}</p>
      )}
      {portfolio.isPartial && (
        <p className={styles.partial}>Available holdings only — not a complete wallet audit.</p>
      )}
    </section>
  );
}

function formatSol(lamports: bigint) {
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatLabel(value: string) {
  return value[0] + value.slice(1).toLowerCase();
}

function labelFor<T extends string>(
  options: readonly Readonly<{ value: T; label: string }>[],
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function shortAddress(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
