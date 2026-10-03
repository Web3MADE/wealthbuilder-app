'use client';

import {
  ArrowRight,
  Check,
  CircleAlert,
  CircleSlash,
  Clock3,
  Coins,
  RefreshCw,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
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
  wealthProfile: Readonly<{
    objective: string;
    horizon: string;
    drawdownPosture: string;
    walletShape: string;
    walletShapeBasis: string;
    liquidityNeed: string;
    volatilityTolerance: string;
    reservePriority: string;
    labels: Readonly<{
      objective: string;
      horizon: string;
      drawdownPosture: string;
      walletShape: string;
      walletShapeBasis: string;
      liquidityNeed: string;
      volatilityTolerance: string;
      reservePriority: string;
    }>;
  }>;
  recommendation: Readonly<{
    opportunity: Readonly<{
      name: string;
      protocol: string;
      description: string;
      leverage: boolean;
    }>;
    allocation:
      | readonly Readonly<{
          label: string;
          asset: string;
          percent: number;
          status: 'held' | 'target';
        }>[]
      | null;
    deterministicReasons: readonly string[];
    explanation: Readonly<{
      headline: string;
      summary: string;
      whyThisFits?: readonly string[];
      walletInsight?: string;
      riskNote: string;
      reviewWhen?: readonly string[];
    }> | null;
  }> | null;
  reasons: readonly string[];
  ruledOut: readonly Readonly<{ strategy: string; reason: string }>[];
}>;

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
  const [goalText, setGoalText] = useState('');
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
          goalText,
          timeHorizon,
          dropBehavior,
          ...(source === 'wallet' ? { walletAddress } : { examplePreset }),
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
          <span className={styles.brandMark}>
            <Image src="/assets/WealthBuilder_logo.png" alt="" width={1774} height={887} priority />
          </span>
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
            <label className={styles.goalTextField}>
              <span className={styles.srOnly}>Describe what you want from crypto</span>
              <input
                aria-label="Describe what you want from crypto"
                onChange={(event) => setGoalText(event.target.value)}
                placeholder="For example, grow my money over the long term"
                type="text"
                value={goalText}
              />
            </label>
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
        <PlanPanel
          error={error}
          isLoading={isLoading}
          onRetry={() => void getPlan()}
          onUseExample={() => setSource('example')}
          result={result}
        />
      </div>
    </main>
  );
}

function PlanPanel({
  error,
  isLoading,
  onRetry,
  onUseExample,
  result,
}: {
  error: string;
  isLoading: boolean;
  onRetry: () => void;
  onUseExample: () => void;
  result: PlanResponse | null;
}) {
  const [isFullPlanOpen, setIsFullPlanOpen] = useState(false);
  const recommendation = result?.recommendation;
  const reasons = recommendation?.explanation?.whyThisFits ?? recommendation?.deterministicReasons;
  const allocation = recommendation?.allocation ?? previewAllocation;
  const ruledOut = result?.ruledOut[0];
  return (
    <section
      className={`${styles.planPanel} ${isLoading ? styles.loadingPanel : ''}`}
      aria-labelledby="your-plan-title"
      aria-busy={isLoading}
    >
      <h2 id="your-plan-title">Your plan</h2>
      {isLoading ? (
        <LoadingPlan />
      ) : error ? (
        <FailurePlan onRetry={onRetry} onUseExample={onUseExample} />
      ) : (
        <div className={`${styles.planCard} ${result ? styles.successCard : styles.previewCard}`}>
          <span className={styles.strategyIcon}>
            <Coins size={30} aria-hidden="true" />
          </span>
          <div className={styles.planEyebrow}>Best fit for you</div>
          <h3>
            {recommendation ? strategyTitle(recommendation.opportunity.name) : 'Stake your SOL'}
          </h3>
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
            {allocation.some((item) => item.status === 'target') && (
              <small>Reserve targets are planning goals, not detected current holdings.</small>
            )}
          </div>
          <div className={styles.ruledOut}>
            <span>Ruled out</span>
            <p>
              <strong>{ruledOut?.strategy ?? 'Higher-risk options'}</strong>
              {ruledOut ? ` — ${ruledOut.reason}` : ' until your goals and timeline support them.'}
            </p>
          </div>
          <button
            type="button"
            className={styles.fullPlanButton}
            disabled={!result || isLoading}
            onClick={() => setIsFullPlanOpen(true)}
          >
            See full plan <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      )}
      {result && isFullPlanOpen && (
        <FullPlanModal result={result} onClose={() => setIsFullPlanOpen(false)} />
      )}
    </section>
  );
}

function LoadingPlan() {
  return (
    <div className={`${styles.planCard} ${styles.loadingCard}`}>
      <div className={styles.loadingIntro}>
        <span className={styles.strategyIcon}>
          <Coins size={30} aria-hidden="true" />
        </span>
        <div>
          <span>Building your personalized plan</span>
          <p>Analyzing your portfolio, matching a strategy, and drafting your recommendation.</p>
        </div>
      </div>
      <div className={styles.progressTrack} aria-label="Plan generation in progress">
        <i />
      </div>
      <div className={styles.loadingDivider} />
      <div className={styles.skeletonRows} aria-hidden="true">
        <div>
          <i />
          <b />
          <em />
        </div>
        <div>
          <i />
          <b />
          <em />
        </div>
        <div>
          <i />
          <b />
          <em />
        </div>
      </div>
    </div>
  );
}

function FailurePlan({ onRetry, onUseExample }: { onRetry: () => void; onUseExample: () => void }) {
  return (
    <div className={`${styles.planCard} ${styles.failureCard}`} role="status">
      <span className={`${styles.strategyIcon} ${styles.errorIcon}`}>
        <CircleAlert size={32} aria-hidden="true" />
      </span>
      <h3>We couldn&apos;t build your plan yet</h3>
      <p className={styles.strategyCopy}>
        Your answers are still here — try again or switch to an example portfolio.
      </p>
      <button type="button" className={styles.retryButton} onClick={onRetry}>
        <RefreshCw size={20} aria-hidden="true" /> Try again
      </button>
      <button type="button" className={styles.useExampleButton} onClick={onUseExample}>
        Use an example <ArrowRight size={19} aria-hidden="true" />
      </button>
    </div>
  );
}

function FullPlanModal({ result, onClose }: { result: PlanResponse; onClose: () => void }) {
  const recommendation = result.recommendation;
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <article
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="full-plan-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <span>Full plan</span>
            <h2 id="full-plan-title">Your personalized crypto strategy and next steps.</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close full plan">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className={styles.modalBody}>
          {recommendation && (
            <>
              <section className={styles.recommendedStrategy}>
                <span className={styles.strategyIcon}>
                  <Coins size={30} aria-hidden="true" />
                </span>
                <div>
                  <span>Recommended strategy</span>
                  <h3>{strategyTitle(recommendation.opportunity.name)}</h3>
                  <p>
                    {recommendation.explanation?.summary ?? recommendation.opportunity.description}
                  </p>
                </div>
              </section>
              <FullPlanSection title="Why this fits">
                <ul className={styles.modalList}>
                  {(recommendation.explanation?.whyThisFits ?? recommendation.deterministicReasons)
                    .slice(0, 3)
                    .map((reason) => (
                      <li key={reason}>
                        <Check size={18} aria-hidden="true" /> {reason}
                      </li>
                    ))}
                </ul>
              </FullPlanSection>
              <FullPlanSection title="Suggested target split">
                <AllocationBar allocation={recommendation.allocation ?? []} />
                <div className={styles.fullAllocation}>
                  {(recommendation.allocation ?? []).map((item) => (
                    <div key={item.label}>
                      <strong>{item.percent}%</strong>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </FullPlanSection>
              <FullPlanSection title="Your profile">
                <ProfileChips profile={result.wealthProfile} />
              </FullPlanSection>
            </>
          )}
          <FullPlanSection title="Ruled out">
            <ul className={styles.exclusionList}>
              {result.ruledOut.map((item) => (
                <li key={item.strategy}>
                  <CircleSlash size={25} aria-hidden="true" />
                  <div>
                    <strong>{item.strategy}</strong>
                    <span>{item.reason}</span>
                  </div>
                </li>
              ))}
            </ul>
          </FullPlanSection>
          {recommendation?.explanation?.reviewWhen && (
            <FullPlanSection title="When to review">
              <ul className={styles.modalList}>
                {recommendation.explanation.reviewWhen.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ul>
            </FullPlanSection>
          )}
          {recommendation && (
            <p className={styles.protocol}>{recommendation.explanation?.riskNote}</p>
          )}
        </div>
      </article>
    </div>
  );
}

function AllocationBar({
  allocation,
}: {
  allocation: Exclude<NonNullable<PlanResponse['recommendation']>['allocation'], null>;
}) {
  if (!allocation.length) return null;
  return (
    <div className={styles.allocationBar} aria-label="Suggested allocation">
      {allocation.map((item) => (
        <i key={item.label} style={{ width: `${item.percent}%` }} />
      ))}
    </div>
  );
}

function ProfileChips({ profile }: { profile: PlanResponse['wealthProfile'] }) {
  const chips = [
    [TrendingUp, profile.labels.objective],
    [Clock3, profile.labels.horizon],
    [Sparkles, profile.labels.drawdownPosture],
    [Coins, profile.labels.walletShape],
  ] as const;
  return (
    <div className={styles.profileChips}>
      {chips.map(([Icon, label]) => (
        <span key={label}>
          <Icon size={17} aria-hidden="true" /> {label}
        </span>
      ))}
    </div>
  );
}

function FullPlanSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.fullPlanSection}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function strategyTitle(name: string) {
  if (name === 'SOL liquid staking') return 'Stake your SOL';
  if (name === 'Stablecoin lending') return 'Earn on stablecoins';
  if (name === 'Leveraged yield') return 'Higher-risk growth strategy';
  return name;
}

function WealthProfile({ profile }: { profile: PlanResponse['wealthProfile'] }) {
  const facts = [
    profile.labels.horizon,
    profile.labels.drawdownPosture,
    profile.labels.walletShape,
    profile.labels.liquidityNeed,
  ];
  return (
    <div className={styles.wealthProfile}>
      <span>Your profile</span>
      <ul>
        {facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </div>
  );
}

function PortfolioSnapshot({
  portfolio,
  walletShapeBasis,
}: {
  portfolio: PlanResponse['portfolio'];
  walletShapeBasis?: PlanResponse['wealthProfile']['walletShapeBasis'];
}) {
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
        <small>
          {walletShapeBasis === 'partial-valuation'
            ? 'Some visible holdings have no USD value. Shape is based on holdings with available values.'
            : walletShapeBasis === 'asset-presence'
              ? 'Shape is based on detected asset presence, not USD values.'
              : 'Available public holdings only — not a complete wallet audit.'}
        </small>
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
  { label: 'SOL staking', asset: 'SOL', percent: 70, status: 'held' },
  { label: 'Liquid stablecoin reserve target', asset: 'USDC', percent: 30, status: 'target' },
] as const;

const previewReasons = ['Matches your goal', 'Fits your timeframe', 'Keeps your SOL available'];
