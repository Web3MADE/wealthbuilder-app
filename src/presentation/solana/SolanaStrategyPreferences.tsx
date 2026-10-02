'use client';

import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import {
  PreferenceOption,
  type PreferenceOptionClassNames,
} from '@/presentation/preferences/PreferenceOption';
import {
  isCompleteSolanaStrategyPreferences,
  solanaStrategyGoalLabels,
  solanaStrategyRiskLabels,
  solanaStrategyTimelineLabels,
  type SolanaStrategyGoal,
  type SolanaStrategyPreferences,
  type SolanaStrategyRisk,
  type SolanaStrategyTimeline,
} from './solana-strategy-preferences';

const optionClassNames: PreferenceOptionClassNames = {
  root: 'solana-preference-option',
  icon: 'solana-preference-option-icon',
  copy: 'solana-preference-option-copy',
  label: '',
  description: '',
  check: 'solana-preference-option-check',
};

const goals: readonly Readonly<{
  value: SolanaStrategyGoal;
  description: string;
}>[] = [
  { value: 'long-term-wealth', description: 'Grow steadily over time.' },
  { value: 'preserve-crypto', description: 'Prioritise resilience and control.' },
  { value: 'growth', description: 'Accept more volatility for upside.' },
];

const timelines: readonly Readonly<{
  value: SolanaStrategyTimeline;
  description: string;
}>[] = [
  { value: '1-3-years', description: 'Build with flexibility.' },
  { value: '3-5-years', description: 'Balance growth and access.' },
  { value: '5-plus-years', description: 'Focus on the long term.' },
];

const risks: readonly Readonly<{
  value: SolanaStrategyRisk;
  description: string;
}>[] = [
  { value: 'conservative', description: 'Protect capital, lower volatility.' },
  { value: 'balanced', description: 'Growth with controlled risk.' },
  { value: 'growth', description: 'Accept more volatility for upside.' },
];

type PreferenceStep = 0 | 1 | 2 | 3;

export function SolanaStrategyPreferences({
  preferences,
  balance,
  onChange,
  onBack,
  onFind,
  finding,
  error,
}: {
  preferences: SolanaStrategyPreferences;
  balance: string;
  onChange: (preferences: SolanaStrategyPreferences) => void;
  onBack: () => void;
  onFind: () => void;
  finding: boolean;
  error: string;
}) {
  const [step, setStep] = useState<PreferenceStep>(0);
  const complete = isCompleteSolanaStrategyPreferences(preferences);

  function next() {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1 && preferences.timeline) {
      setStep(2);
      return;
    }
    if (step === 2 && preferences.risk) setStep(3);
  }

  function previous() {
    if (step === 0) {
      onBack();
      return;
    }
    setStep((current) => (current - 1) as PreferenceStep);
  }

  if (step === 3 && complete) {
    return (
      <section className="solana-strategy-summary" aria-labelledby="solana-plan-title">
        <div className="solana-flow-progress" aria-label="Strategy preferences complete">
          <span>Plan ready</span>
          <div>
            <i className="is-complete" />
            <i className="is-complete" />
            <i className="is-complete" />
          </div>
        </div>
        <div className="solana-summary-heading">
          <span className="solana-summary-mark">
            <Check size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="solana-overline">Your plan</p>
            <h1 id="solana-plan-title">Ready to build your strategy.</h1>
          </div>
        </div>
        <dl className="solana-plan-summary">
          <div>
            <dt>Goal</dt>
            <dd>{solanaStrategyGoalLabels[preferences.goal]}</dd>
          </div>
          <div>
            <dt>Timeline</dt>
            <dd>{solanaStrategyTimelineLabels[preferences.timeline]}</dd>
          </div>
          <div>
            <dt>Risk</dt>
            <dd>{solanaStrategyRiskLabels[preferences.risk]} risk</dd>
          </div>
        </dl>
        <div className="solana-summary-portfolio">
          <span>Current portfolio</span>
          <strong>{balance} SOL</strong>
        </div>
        <button type="button" className="solana-primary-action" onClick={onFind} disabled={finding}>
          Find my strategy <ArrowRight size={18} aria-hidden="true" />
        </button>
        {error && (
          <p className="solana-flow-error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="solana-text-button" onClick={() => setStep(0)}>
          Edit preferences
        </button>
      </section>
    );
  }

  const content =
    step === 0
      ? {
          eyebrow: 'Step 1 of 3',
          title: 'What are you building toward?',
          description: 'Choose the direction for your long-term strategy.',
          options: goals,
          selected: preferences.goal,
          select: (value: string) =>
            onChange({ ...preferences, goal: value as SolanaStrategyGoal }),
        }
      : step === 1
        ? {
            eyebrow: 'Step 2 of 3',
            title: 'What is your timeline?',
            description: 'This helps balance access and long-term focus.',
            options: timelines,
            selected: preferences.timeline,
            select: (value: string) =>
              onChange({ ...preferences, timeline: value as SolanaStrategyTimeline }),
          }
        : {
            eyebrow: 'Step 3 of 3',
            title: 'How should growth feel?',
            description: 'Choose a risk level that feels right for you.',
            options: risks,
            selected: preferences.risk,
            select: (value: string) =>
              onChange({ ...preferences, risk: value as SolanaStrategyRisk }),
          };

  const canContinue =
    step === 0 || (step === 1 ? Boolean(preferences.timeline) : Boolean(preferences.risk));

  return (
    <section className="solana-preferences" aria-labelledby="solana-preferences-title">
      <div className="solana-flow-progress" aria-label={content.eyebrow}>
        <span>{content.eyebrow}</span>
        <div>
          {[0, 1, 2].map((index) => (
            <i key={index} className={index <= step ? 'is-complete' : ''} />
          ))}
        </div>
      </div>
      <p className="solana-overline">Build your strategy</p>
      <h1 id="solana-preferences-title">{content.title}</h1>
      <p className="solana-flow-description">{content.description}</p>
      <div className="solana-preference-options">
        {content.options.map((option) => (
          <PreferenceOption
            key={option.value}
            label={
              step === 0
                ? solanaStrategyGoalLabels[option.value as SolanaStrategyGoal]
                : step === 1
                  ? solanaStrategyTimelineLabels[option.value as SolanaStrategyTimeline]
                  : solanaStrategyRiskLabels[option.value as SolanaStrategyRisk]
            }
            description={option.description}
            selected={content.selected === option.value}
            onSelect={() => content.select(option.value)}
            classNames={optionClassNames}
          />
        ))}
      </div>
      <div className="solana-flow-actions">
        <button type="button" className="solana-secondary-action" onClick={previous}>
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </button>
        <button
          type="button"
          className="solana-primary-action"
          disabled={!canContinue}
          onClick={next}
        >
          {step === 2 ? 'Review plan' : 'Continue'} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
