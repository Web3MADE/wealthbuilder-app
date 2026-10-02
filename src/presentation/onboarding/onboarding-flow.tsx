'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PreferenceOption } from '@/presentation/preferences/PreferenceOption';
import { canContinue, emptyPolicy, nextStep, type Policy } from './onboarding-state';
import { DEV_MODE_KEY, ONBOARDING_KEY, resolveDevUserMode } from '@/presentation/dev/dev-user-mode';
import { DevUserSwitcher } from '@/presentation/dev/DevUserSwitcher';
import './onboarding.css';

type PolicyKey = keyof Policy;

const steps = ['Welcome', 'Your goal', 'Risk & horizon', 'Your preferences', 'Review & activate'];
const goals = [
  { label: 'Grow long-term wealth', detail: 'Build and compound over time.', icon: '▥' },
  {
    label: 'Reach financial freedom',
    detail: 'More independence for a brighter future.',
    icon: '◎',
  },
  {
    label: 'Preserve existing wealth',
    detail: 'Focus on capital protection and stability.',
    icon: '◇',
  },
  { label: 'I’m not sure yet', detail: 'Find the right approach as you go.', icon: '···' },
];
const assets = [
  'BTC / ETH focused',
  'Balanced large-cap crypto',
  'Stablecoin-heavy',
  'Broader opportunities',
];
const liquidity = ['Keep more liquid', 'Balanced', 'Maximize long-term deployment'];
const aiLevels = [
  {
    label: 'Recommendations only',
    detail: 'See insights and suggestions. Every decision stays with you.',
    icon: '▤',
  },
  {
    label: 'Prepare and I approve',
    detail: 'WealthBuilder prepares actions for your review and approval.',
    icon: '♙',
  },
  {
    label: 'Bounded autonomy',
    detail: 'Set the rules and limits for actions you may allow later.',
    icon: '⚙',
  },
];

function PrimaryButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="onb-primary" type="button" onClick={onClick} disabled={disabled}>
      {children}
      <span aria-hidden="true">→</span>
    </button>
  );
}

function ChoiceCard({
  label,
  detail,
  icon,
  selected,
  onClick,
}: {
  label: string;
  detail: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <PreferenceOption
      label={label}
      description={detail}
      icon={icon}
      selected={selected}
      onSelect={onClick}
      classNames={{
        root: 'onb-choice',
        icon: 'onb-choice-icon',
        copy: 'onb-choice-copy',
        label: '',
        description: '',
        check: 'onb-choice-check',
      }}
    />
  );
}

function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="onb-segment-field">
      <legend>{label}</legend>
      <div className="onb-segments">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={value === option ? 'is-selected' : ''}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ChatPromptInput() {
  const [prompt, setPrompt] = useState('');
  const [notice, setNotice] = useState(false);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (prompt.trim()) setNotice(true);
  };
  return (
    <div className="onb-chat">
      <form onSubmit={submit}>
        <span aria-hidden="true">✦</span>
        <label className="sr-only" htmlFor="wealthbuilder-prompt">
          Ask WealthBuilder anything
        </label>
        <input
          id="wealthbuilder-prompt"
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            setNotice(false);
          }}
          placeholder="Ask WealthBuilder anything…"
        />
        <button type="submit" aria-label="Send prompt">
          ➤
        </button>
      </form>
      <div className="onb-prompts" aria-label="Example prompts">
        {[
          'Make me slightly more aggressive',
          'Keep 20% liquid',
          'I want to focus on BTC and ETH',
        ].map((example) => (
          <button
            type="button"
            key={example}
            onClick={() => {
              setPrompt(example);
              setNotice(false);
            }}
          >
            {example}
          </button>
        ))}
      </div>
      {notice && (
        <p className="onb-chat-notice" role="status">
          AI chat is coming soon. Your policy choices above are ready to review.
        </p>
      )}
    </div>
  );
}

function StepProgress({ step, goTo }: { step: number; goTo: (step: number) => void }) {
  return (
    <>
      <nav className="onb-rail" aria-label="Onboarding progress">
        <ol>
          {steps.map((name, index) => (
            <li key={name}>
              <button
                type="button"
                disabled={index > step || step === 5}
                onClick={() => goTo(index)}
                aria-current={index === step ? 'step' : undefined}
              >
                <span className={`onb-step-number ${index < step ? 'is-done' : ''}`}>
                  {index < step ? '✓' : index + 1}
                </span>
                <span>{name}</span>
              </button>
            </li>
          ))}
        </ol>
        <p>
          Your wealth.
          <br />
          Your rules.
        </p>
      </nav>
      <div className="onb-mobile-progress" aria-label={`Step ${Math.min(step + 1, 5)} of 5`}>
        <span>{step === 5 ? 'Complete' : `${step + 1} of 5`}</span>
        <div>
          {steps.map((name, index) => (
            <i key={name} className={index <= step ? 'is-active' : ''} />
          ))}
        </div>
      </div>
    </>
  );
}

function PolicySummary({ policy, edit }: { policy: Policy; edit: (step: number) => void }) {
  const rows: { key: PolicyKey; label: string; step: number; icon: string }[] = [
    { key: 'goal', label: 'Goal', step: 1, icon: '◎' },
    { key: 'horizon', label: 'Time horizon', step: 2, icon: '◷' },
    { key: 'risk', label: 'Risk tolerance', step: 2, icon: '▥' },
    { key: 'asset', label: 'Asset preference', step: 3, icon: '◕' },
    { key: 'liquidity', label: 'Liquidity preference', step: 3, icon: '≋' },
    { key: 'ai', label: 'AI control level', step: 3, icon: '⚙' },
  ];
  return (
    <div className="onb-summary">
      {rows.map(({ key, label, step, icon }) => (
        <div className="onb-summary-row" key={key}>
          <span className="onb-summary-icon" aria-hidden="true">
            {icon}
          </span>
          <span className="onb-summary-copy">
            <small>{label}</small>
            <strong>{policy[key]}</strong>
          </span>
          <button type="button" onClick={() => edit(step)} aria-label={`Edit ${label}`}>
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [policy, setPolicy] = useState<Policy>(emptyPolicy);
  const [returnToReview, setReturnToReview] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const mode = resolveDevUserMode(null, window.localStorage.getItem(DEV_MODE_KEY));
      if (mode === 'existing') {
        window.location.replace('/home');
        return;
      }
      const saved = window.localStorage.getItem(ONBOARDING_KEY);
      if (saved) {
        try {
          const progress = JSON.parse(saved) as { step?: number; policy?: Policy };
          if (progress.policy && typeof progress.step === 'number') {
            queueMicrotask(() => {
              setPolicy(progress.policy!);
              setStep(Math.min(Math.max(progress.step!, 0), 5));
            });
          }
        } catch {
          window.localStorage.removeItem(ONBOARDING_KEY);
        }
      }
    }
    queueMicrotask(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded && process.env.NODE_ENV !== 'production') {
      window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ step, policy }));
    }
  }, [loaded, step, policy]);
  const update = (key: PolicyKey, value: string) =>
    setPolicy((current) => ({ ...current, [key]: value }));
  const edit = (target: number) => {
    setReturnToReview(true);
    setStep(target);
  };
  const next = () => {
    setStep((current) => nextStep(current, returnToReview));
    setReturnToReview(false);
  };
  const back = () => {
    setReturnToReview(false);
    setStep((current) => Math.max(current - 1, 0));
  };
  const restart = () => {
    window.localStorage.removeItem(ONBOARDING_KEY);
    setPolicy(emptyPolicy);
    setStep(0);
    setReturnToReview(false);
  };
  const ready = canContinue(step, policy);

  if (!loaded)
    return (
      <main className="entry-gate">
        <p>Opening WealthBuilder…</p>
      </main>
    );

  return (
    <main className="onb-page" id="main-content">
      <div className="onb-shell">
        <header className="onb-header">
          <Link href="/" aria-label="WealthBuilder home" className="onb-logo">
            <Image
              src="/assets/WealthBuilder_logo.png"
              alt="WealthBuilder"
              width={1774}
              height={887}
              priority
            />
          </Link>
          <span>YOUR WEALTH. YOUR RULES.</span>
        </header>
        <div className="onb-frame">
          <StepProgress
            step={step}
            goTo={(target) => {
              setReturnToReview(false);
              setStep(target);
            }}
          />
          <div className="onb-main">
            {step > 0 && step < 5 && (
              <button
                className="onb-top-back"
                type="button"
                onClick={back}
                aria-label="Previous step"
              >
                ←
              </button>
            )}
            {step === 0 && (
              <section className="onb-welcome" aria-labelledby="onb-title">
                <div className="onb-welcome-content">
                  <p className="onb-kicker">WELCOME TO WEALTHBUILDER</p>
                  <h1 id="onb-title">
                    Build long-term
                    <br />
                    <span>crypto wealth.</span>
                  </h1>
                  <p className="onb-lead">
                    Self-custodial. AI-assisted. Built for long-term wealth building.
                  </p>
                  <div className="onb-trust">
                    <span>
                      ♧
                      <small>
                        You control
                        <br />
                        your assets
                      </small>
                    </span>
                    <span>
                      ✳
                      <small>
                        AI-assisted
                        <br />
                        strategy
                      </small>
                    </span>
                    <span>
                      ♙
                      <small>
                        Security
                        <br />
                        first
                      </small>
                    </span>
                  </div>
                  <PrimaryButton onClick={next}>Get started</PrimaryButton>
                </div>
                <p className="onb-welcome-footer">A smarter way to build wealth.</p>
              </section>
            )}
            {step === 1 && (
              <section className="onb-content" aria-labelledby="onb-title">
                <p className="onb-kicker">STEP 2 OF 5</p>
                <h1 id="onb-title">What’s your main goal?</h1>
                <p className="onb-subtitle">This helps us tailor your WealthBuilder experience.</p>
                <div className="onb-choice-grid">
                  {goals.map((goal) => (
                    <ChoiceCard
                      key={goal.label}
                      {...goal}
                      selected={policy.goal === goal.label}
                      onClick={() => update('goal', goal.label)}
                    />
                  ))}
                </div>
                <div className="onb-actions">
                  <button type="button" className="onb-secondary" onClick={back}>
                    Back
                  </button>
                  <PrimaryButton onClick={next} disabled={!ready}>
                    {returnToReview ? 'Review policy' : 'Next'}
                  </PrimaryButton>
                </div>
              </section>
            )}
            {step === 2 && (
              <section className="onb-content" aria-labelledby="onb-title">
                <p className="onb-kicker">STEP 3 OF 5</p>
                <h1 id="onb-title">Set your risk and time horizon.</h1>
                <p className="onb-subtitle">This helps us design the right strategy for you.</p>
                <div className="onb-control-stack">
                  <SegmentedControl
                    label="Time horizon"
                    options={['1–3 years', '3–5 years', '5–10 years', '10+ years']}
                    value={policy.horizon}
                    onChange={(value) => update('horizon', value)}
                  />
                  <SegmentedControl
                    label="Risk tolerance"
                    options={['Conservative', 'Moderate', 'Aggressive']}
                    value={policy.risk}
                    onChange={(value) => update('risk', value)}
                  />
                </div>
                <p className="onb-context">
                  Higher risk can mean higher potential returns and greater volatility.
                </p>
                <div className="onb-actions">
                  <button type="button" className="onb-secondary" onClick={back}>
                    Back
                  </button>
                  <PrimaryButton onClick={next} disabled={!ready}>
                    {returnToReview ? 'Review policy' : 'Continue'}
                  </PrimaryButton>
                </div>
              </section>
            )}
            {step === 3 && (
              <section className="onb-content onb-preferences" aria-labelledby="onb-title">
                <p className="onb-kicker">STEP 4 OF 5</p>
                <h1 id="onb-title">Shape your WealthBuilder policy.</h1>
                <p className="onb-subtitle">Choose what matters to you. You can change it later.</p>
                <div className="onb-preference-fields">
                  <SegmentedControl
                    label="Asset preference"
                    options={assets}
                    value={policy.asset}
                    onChange={(value) => update('asset', value)}
                  />
                  <SegmentedControl
                    label="Liquidity preference"
                    options={liquidity}
                    value={policy.liquidity}
                    onChange={(value) => update('liquidity', value)}
                  />
                </div>
                <h2>How should WealthBuilder help?</h2>
                <p className="onb-helper">
                  Choose the level of AI control that feels right to you.
                </p>
                <div className="onb-ai-grid">
                  {aiLevels.map((level) => (
                    <ChoiceCard
                      key={level.label}
                      {...level}
                      selected={policy.ai === level.label}
                      onClick={() => update('ai', level.label)}
                    />
                  ))}
                </div>
                <ChatPromptInput />
                <div className="onb-actions">
                  <button type="button" className="onb-secondary" onClick={back}>
                    Back
                  </button>
                  <PrimaryButton onClick={next} disabled={!ready}>
                    {returnToReview ? 'Review policy' : 'Continue'}
                  </PrimaryButton>
                </div>
              </section>
            )}
            {step === 4 && (
              <section className="onb-content onb-review" aria-labelledby="onb-title">
                <p className="onb-kicker">STEP 5 OF 5</p>
                <h1 id="onb-title">Review your WealthBuilder policy.</h1>
                <p className="onb-subtitle">
                  Everything look right? Activate your policy to finish onboarding.
                </p>
                <PolicySummary policy={policy} edit={edit} />
                <div className="onb-actions">
                  <button type="button" className="onb-secondary" onClick={back}>
                    Back
                  </button>
                  <PrimaryButton onClick={next}>Activate policy</PrimaryButton>
                </div>
                <p className="onb-assurance">
                  ♙ &nbsp; Your assets remain in your control. Always.
                </p>
              </section>
            )}
            {step === 5 && (
              <section className="onb-content onb-complete" aria-labelledby="onb-title">
                <div className="onb-complete-mark" aria-hidden="true">
                  ✓
                </div>
                <p className="onb-kicker">POLICY ACTIVATED</p>
                <h1 id="onb-title">Your policy is ready.</h1>
                <p className="onb-subtitle">
                  Your WealthBuilder preferences are set for this session. Your account experience
                  is coming soon.
                </p>
                <div className="onb-complete-actions">
                  <button type="button" className="onb-secondary" onClick={restart}>
                    Restart onboarding
                  </button>
                  <Link className="onb-primary" href="/">
                    Back to home <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
      <DevUserSwitcher />
    </main>
  );
}
