'use client';

import {
  ArrowRight,
  Check,
  CircleAlert,
  Mail,
  Send,
  Target,
  UserRound,
  WalletCards,
} from 'lucide-react';
import Image from 'next/image';
import { useState, type FormEvent } from 'react';
import styles from './PlanScreen.module.css';

type TimeHorizon = 'within-1-year' | '1-3-years' | '3-5-years' | '5-plus-years';
type LiquidityPreference = 'most' | 'some' | 'very-little' | 'not-sure';
type RiskPreference = 'lower-risk' | 'balanced' | 'high-volatility';
type CryptoExperience = 'new' | 'comfortable' | 'advanced-defi-user';

const timeOptions = [
  ['within-1-year', 'Within 1 year'],
  ['1-3-years', '1–3 years'],
  ['3-5-years', '3–5 years'],
  ['5-plus-years', '5+ years'],
] as const;
const liquidityOptions = [
  ['most', 'Most'],
  ['some', 'Some'],
  ['very-little', 'Very little'],
  ['not-sure', 'Not sure'],
] as const;
const riskOptions = [
  ['lower-risk', 'Prefer lower risk'],
  ['balanced', 'Balanced'],
  ['high-volatility', 'Comfortable with high volatility'],
] as const;
const experienceOptions = [
  ['new', 'New'],
  ['comfortable', 'Comfortable'],
  ['advanced-defi-user', 'Advanced / DeFi user'],
] as const;

export function PlanScreen() {
  const [goal, setGoal] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon | null>(null);
  const [liquidityPreference, setLiquidityPreference] = useState<LiquidityPreference | null>(null);
  const [riskPreference, setRiskPreference] = useState<RiskPreference | null>(null);
  const [cryptoExperience, setCryptoExperience] = useState<CryptoExperience | null>(null);
  const [additionalContext, setAdditionalContext] = useState('');
  const [email, setEmail] = useState('');
  const [contactHandle, setContactHandle] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          goal,
          portfolio,
          timeHorizon,
          liquidityPreference,
          riskPreference,
          cryptoExperience,
          additionalContext,
          email,
          contactHandle,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(data.error ?? "We couldn't save your details. Please try again.");
      setSubmittedEmail(email.trim());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We couldn't save your details. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
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
        <span className={styles.tagline}>A smarter way to grow with crypto</span>
      </header>
      {submittedEmail ? (
        <Confirmation email={submittedEmail} />
      ) : (
        <div className={styles.layout}>
          <section className={styles.formColumn} aria-labelledby="plan-title">
            <h1 id="plan-title">
              Build a crypto plan around <em>your life.</em>
            </h1>
            <p className={styles.lede}>
              Tell us about your goals, portfolio and preferences. We&apos;ll review it and send you
              a personalized crypto plan.
            </p>
            <form onSubmit={(event) => void submit(event)} noValidate>
              <Question number="1" title="What are you trying to achieve with your money/crypto?">
                <textarea
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="I want to grow enough to buy a house in 5 years and still keep some money accessible."
                  rows={3}
                />
              </Question>
              <Question number="2" title="What does your portfolio roughly look like today?">
                <textarea
                  value={portfolio}
                  onChange={(event) => setPortfolio(event.target.value)}
                  placeholder="For example: SOL 40%, BTC 20%, ETH 15%, USDC 25%"
                  rows={2}
                />
                <div className={styles.questionDivider} />
                <h3>How soon might you need some of this money?</h3>
                <Choices options={timeOptions} value={timeHorizon} onChange={setTimeHorizon} />
              </Question>
              <Question number="3" title="Preferences and situation">
                <div className={styles.preferenceGrid}>
                  <div>
                    <h3>How much do you need to keep easily accessible?</h3>
                    <Choices
                      options={liquidityOptions}
                      value={liquidityPreference}
                      onChange={setLiquidityPreference}
                    />
                  </div>
                  <div className={styles.riskChoice}>
                    <h3>How comfortable are you with crypto risk?</h3>
                    <Choices
                      options={riskOptions}
                      value={riskPreference}
                      onChange={setRiskPreference}
                    />
                  </div>
                </div>
                <div className={styles.experienceChoice}>
                  <h3>What&apos;s your crypto experience?</h3>
                  <Choices
                    options={experienceOptions}
                    value={cryptoExperience}
                    onChange={setCryptoExperience}
                  />
                </div>
                <label className={styles.optionalField}>
                  <span>
                    Anything else we should know about your situation? <small>(optional)</small>
                  </span>
                  <textarea
                    value={additionalContext}
                    onChange={(event) => setAdditionalContext(event.target.value)}
                    placeholder="No leverage, upcoming expenses, income needs, never sell BTC, etc."
                    rows={2}
                  />
                </label>
              </Question>
              <Question number="4" title="Where should we send your plan?">
                <div className={styles.contactFields}>
                  <label className={styles.contactField}>
                    <Mail size={22} aria-hidden="true" />
                    <span>Email address</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>
                  <label className={styles.contactField}>
                    <Send size={22} aria-hidden="true" />
                    <span>
                      Telegram or WhatsApp <small>(optional)</small>
                    </span>
                    <input
                      type="text"
                      value={contactHandle}
                      onChange={(event) => setContactHandle(event.target.value)}
                      placeholder="@username or +1 234 567 890"
                      autoComplete="off"
                    />
                  </label>
                </div>
                <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                  {isSubmitting ? 'Sending…' : 'Send me my plan'}{' '}
                  <ArrowRight size={23} aria-hidden="true" />
                </button>
                {error && (
                  <p className={styles.error} role="alert">
                    <CircleAlert size={17} /> {error}
                  </p>
                )}
              </Question>
            </form>
          </section>
          <OfferPanel />
        </div>
      )}
      <footer className={styles.footer}>
        For educational and planning purposes. Crypto involves risk and can lose value.
      </footer>
    </main>
  );
}

function Question({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={styles.question}>
      <legend>
        <b>{number}</b>
        <span>{title}</span>
      </legend>
      {children}
    </fieldset>
  );
}
function Choices<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string])[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.choices}>
      {options.map(([option, label]) => (
        <button
          type="button"
          key={option}
          className={value === option ? styles.choiceActive : styles.choice}
          onClick={() => onChange(option)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
function OfferPanel() {
  const benefits = [
    [UserRound, 'Build a crypto plan around your life'],
    [WalletCards, 'Know what to keep liquid and what to put to work'],
    [Target, 'Get the 3–5 opportunities most worth exploring'],
    [Check, 'Stop researching endlessly and get a clear roadmap'],
  ] as const;
  return (
    <aside className={styles.offerPanel}>
      <span className={styles.earlyAccess}>Free early access</span>
      <h2>
        Stop guessing <em>with your crypto.</em>
      </h2>
      <p>Tell us what you want from life, what you own, and what matters to you.</p>
      <p className={styles.offerPromise}>
        Within 3 days, we&apos;ll personally review your situation and send you a clear crypto plan
        built around you.
      </p>
      <ul>
        {benefits.map(([Icon, benefit]) => (
          <li key={benefit}>
            <i>
              <Icon size={24} />
            </i>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <a href="#plan-title" className={styles.offerButton}>
        Get my free plan <ArrowRight size={23} />
      </a>
      <p className={styles.earlyUsers}>
        <UserRound size={20} /> Free for the first 100 early users.
      </p>
      <div className={styles.offerArtwork}>
        <Image
          src="/assets/WB_backgroundImage.png"
          alt=""
          fill
          sizes="(max-width: 760px) 100vw, 420px"
        />
      </div>
    </aside>
  );
}
function Confirmation({ email }: { email: string }) {
  return (
    <section className={styles.confirmation} aria-live="polite">
      <span className={styles.confirmationIcon}>
        <Check size={36} />
      </span>
      <p className={styles.confirmationEyebrow}>Your request is in</p>
      <h1>We&apos;ve got it.</h1>
      <p>
        We&apos;ll review your goals, portfolio and preferences and send your personalized crypto
        plan within 3 days.
      </p>
      <strong>{email}</strong>
      <ul>
        <li>
          <Check size={18} /> Personally reviewed
        </li>
        <li>
          <Check size={18} /> Built around your situation
        </li>
        <li>
          <Check size={18} /> Delivered by email
        </li>
      </ul>
    </section>
  );
}
