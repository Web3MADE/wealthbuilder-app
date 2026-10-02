'use client';

import { ArrowRight, Check, CircleAlert, Coins, Sparkles } from 'lucide-react';
import { useState } from 'react';
import styles from './PlanScreen.module.css';

type Source = 'wallet' | 'example';
type Goal = 'grow' | 'safer' | 'income' | 'freedom';
type TimeHorizon = 'within-1-year' | '1-3-years' | '3-5-years' | '5-plus-years';
type DropBehavior = 'sell' | 'hold' | 'buy-more' | 'depends';
type ExamplePreset = 'sol-heavy' | 'stablecoin-saver' | 'diversified-crypto';

type PlanResponse = Readonly<{
  portfolio: Readonly<{
    source: Source;
    label?: string;
    walletAddress?: string;
    solBalance: string;
    solUsdValue: number | null;
    topTokenHoldings: readonly Readonly<{
      symbol: string;
      amount: string;
      usdValue: number | null;
    }>[];
    approximateTotalUsdValue: number | null;
    isPartial: boolean;
  }>;
  suitability: Readonly<{
    goal: Goal;
    timeHorizon: TimeHorizon;
    dropBehavior: DropBehavior;
  }>;
  recommendation: Readonly<{
    opportunity: Readonly<{
      name: string;
      protocol: string;
      description: string;
      leverage: boolean;
    }>;
    allocation: readonly Readonly<{ label: string; asset: string; percent: number }>[] | null;
    deterministicReasons: readonly string[];
    explanation: Readonly<{
      headline: string;
      summary: string;
      reasons: readonly string[];
      riskNote: string;
    }> | null;
  }> | null;
  reasons: readonly string[];
  ruledOut: readonly Readonly<{ strategy: string; reason: string }>[];
}>;

const goalOptions = [
  ['grow', 'Grow my money'],
  ['safer', 'Keep it safer'],
  ['income', 'Earn regular income'],
  ['freedom', 'More freedom'],
] as const satisfies readonly (readonly [Goal, string])[];

const timeOptions = [
  ['within-1-year', 'Within 1 year'],
  ['1-3-years', '1–3 years'],
  ['3-5-years', '3–5 years'],
  ['5-plus-years', '5+ years'],
] as const satisfies readonly (readonly [TimeHorizon, string])[];

const behaviorOptions = [
  ['sell', 'Sell'],
  ['hold', 'Hold'],
  ['buy-more', 'Buy more'],
  ['depends', 'It depends'],
] as const satisfies readonly (readonly [DropBehavior, string])[];

const exampleOptions = [
  ['sol-heavy', 'SOL-heavy holder'],
  ['stablecoin-saver', 'Stablecoin-heavy saver'],
  ['diversified-crypto', 'Diversified crypto holder'],
] as const satisfies readonly (readonly [ExamplePreset, string])[];

export function PlanScreen() {
  const [source, setSource] = useState<Source>('wallet');
  const [walletAddress, setWalletAddress] = useState('');
  const [examplePreset, setExamplePreset] = useState<ExamplePreset>('sol-heavy');
  const [goal, setGoal] = useState<Goal>('grow');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('3-5-years');
  const [dropBehavior, setDropBehavior] = useState<DropBehavior>('hold');
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function getPlan() {
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source,
          walletAddress,
          examplePreset,
          goal,
          timeHorizon,
          dropBehavior,
        }),
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
      <header className={styles.siteHeader}>
        <a href="/plan" className={styles.brand} aria-label="WealthBuilder">
          <span className={styles.brandMark}>W</span>
          WealthBuilder
        </a>
      </header>
      <div className={styles.layout}>
        <section className={styles.formPanel} aria-labelledby="plan-title">
          <div className={styles.progress} aria-label="Step 1 of 3">
            <span>1 / 3</span>
            <strong>Create your plan</strong>
            <i />
            <i />
            <i />
          </div>
          <h1 id="plan-title">
            Get your personalized <em>crypto plan.</em>
          </h1>
          <p className={styles.lede}>
            Paste your wallet. Answer 3 quick questions. See what makes sense for you.
          </p>
          <div className={styles.walletMode}>
            <button
              type="button"
              className={source === 'wallet' ? styles.activeMode : undefined}
              onClick={() => setSource('wallet')}
            >
              Use my Solana wallet
            </button>
            <button
              type="button"
              className={source === 'example' ? styles.activeMode : undefined}
              onClick={() => setSource('example')}
            >
              Try an example
            </button>
          </div>
          {source === 'wallet' ? (
            <label className={styles.walletField}>
              <span>Your Solana wallet</span>
              <div>
                <Sparkles size={21} aria-hidden="true" />
                <input
                  value={walletAddress}
                  onChange={(event) => setWalletAddress(event.target.value)}
                  placeholder="Enter your wallet address…"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
            </label>
          ) : (
            <fieldset className={styles.examples}>
              <legend>Example portfolio</legend>
              {exampleOptions.map(([value, label]) => (
                <ChoicePill
                  key={value}
                  selected={examplePreset === value}
                  onClick={() => setExamplePreset(value)}
                >
                  {label}
                </ChoicePill>
              ))}
            </fieldset>
          )}
          <QuestionBlock number="1" label="What do you want from crypto?">
            <Pills options={goalOptions} value={goal} onChange={setGoal} />
          </QuestionBlock>
          <QuestionBlock number="2" label="How soon might you need this money?">
            <Pills options={timeOptions} value={timeHorizon} onChange={setTimeHorizon} />
          </QuestionBlock>
          <QuestionBlock number="3" label="What do you do when your crypto drops a lot?">
            <Pills options={behaviorOptions} value={dropBehavior} onChange={setDropBehavior} />
          </QuestionBlock>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void getPlan()}
            disabled={isLoading}
          >
            {isLoading ? 'Building your plan…' : 'Get my plan'}
            {!isLoading && <ArrowRight size={23} aria-hidden="true" />}
          </button>
          {error && (
            <p className={styles.error} role="alert">
              <CircleAlert size={16} aria-hidden="true" /> {error}
            </p>
          )}
          <p className={styles.disclosure}>
            {source === 'wallet'
              ? 'We only read a public Mainnet wallet snapshot. Nothing is connected or moved.'
              : 'Example portfolios are illustrative and not connected to a wallet.'}
          </p>
        </section>
        <PlanPanel result={result} />
      </div>
    </main>
  );
}

function PlanPanel({ result }: { result: PlanResponse | null }) {
  const recommendation = result?.recommendation;
  const reasons = recommendation?.explanation?.reasons ?? recommendation?.deterministicReasons;
  const allocation = recommendation?.allocation ?? previewAllocation;
  const ruledOut = result?.ruledOut[0];
  return (
    <section className={styles.planPanel} aria-labelledby="your-plan-title">
      <h2 id="your-plan-title">Your plan</h2>
      <div className={styles.planCard}>
        <span className={styles.strategyIcon}>
          <Coins size={30} aria-hidden="true" />
        </span>
        <div className={styles.planEyebrow}>Best fit for you</div>
        <h3>{recommendation?.opportunity.name ?? 'Stake your SOL'}</h3>
        <p className={styles.strategyCopy}>
          {recommendation?.explanation?.summary ??
            'A simple way to grow your SOL while keeping it available.'}
        </p>
        <ul className={styles.reasons}>
          {(reasons ?? previewReasons).slice(0, 3).map((reason) => (
            <li key={reason}>
              <Check size={19} aria-hidden="true" /> {reason}
            </li>
          ))}
        </ul>
        <div className={styles.split}>
          <span>Suggested target split</span>
          <strong>
            {allocation.map((item, index) => (
              <span key={item.label}>
                <em>{item.percent}%</em> {item.label}
                {index < allocation.length - 1 && ' / '}
              </span>
            ))}
          </strong>
        </div>
        {result?.portfolio && <PortfolioSnapshot portfolio={result.portfolio} />}
        <div className={styles.ruledOut}>
          <span>Ruled out</span>
          <p>
            <strong>{ruledOut?.strategy ?? 'Higher-risk options'}</strong>
            {ruledOut ? ` — ${ruledOut.reason}` : ' until your goals and timeline support them.'}
          </p>
        </div>
        {recommendation && (
          <p className={styles.protocol}>
            {recommendation.opportunity.protocol} is a strategy example, not an action from this
            page.
          </p>
        )}
        <button type="button" className={styles.fullPlanButton} disabled={!result}>
          See full plan <ArrowRight size={20} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function PortfolioSnapshot({ portfolio }: { portfolio: PlanResponse['portfolio'] }) {
  return (
    <div className={styles.snapshot}>
      <span>What you have</span>
      <strong>{portfolio.solBalance} SOL</strong>
      {portfolio.topTokenHoldings.length > 0 && (
        <p>
          {portfolio.topTokenHoldings
            .map((holding) => `${holding.amount} ${holding.symbol}`)
            .join(' · ')}
        </p>
      )}
      {portfolio.isPartial && (
        <small>Available public holdings only — not a complete wallet audit.</small>
      )}
    </div>
  );
}

function QuestionBlock({
  number,
  label,
  children,
}: {
  number: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={styles.question}>
      <legend>
        <b>{number}</b>
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.pills}>
      {options.map(([option, label]) => (
        <ChoicePill key={option} selected={value === option} onClick={() => onChange(option)}>
          {label}
        </ChoicePill>
      ))}
    </div>
  );
}

function ChoicePill({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={selected ? styles.selectedPill : styles.pill}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const previewAllocation = [
  { label: 'SOL staking', asset: 'SOL', percent: 70 },
  { label: 'USDC reserve', asset: 'USDC', percent: 30 },
] as const;

const previewReasons = ['Matches your goal', 'Fits your timeframe', 'Keeps your SOL available'];
