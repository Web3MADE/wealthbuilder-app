'use client';

import { useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { useSmartAccount } from '@/application/interfaces/smart-account';
import './account-activation.css';

export function WealthBuilderAccountControl({ compact = false }: { compact?: boolean }) {
  const { smartAccountAddress, accountStatus, setup } = useSmartAccount();
  const [open, setOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');

  async function activate() {
    setActivating(true);
    setError('');
    try {
      await setup();
    } catch (activationError) {
      setError(
        activationError instanceof Error
          ? activationError.message
          : 'Could not activate your account.',
      );
    } finally {
      setActivating(false);
    }
  }

  const active = accountStatus === 'active' && Boolean(smartAccountAddress);
  const label =
    accountStatus === 'checking'
      ? 'Checking account…'
      : active
        ? 'Account active'
        : 'Activate WealthBuilder Account';

  return (
    <>
      <button
        type="button"
        className={`wb-account-control ${compact ? 'is-compact' : ''} ${active ? 'is-active' : ''}`}
        onClick={() => setOpen(true)}
        disabled={accountStatus === 'checking'}
      >
        {active && <Check />}
        {label}
      </button>
      {open && (
        <div className="wb-account-dialog-backdrop" role="presentation">
          <section
            className="wb-account-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-activation-title"
          >
            <button
              type="button"
              className="wb-account-dialog-close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            {active ? (
              <>
                <span className="wb-account-dialog-icon">
                  <Check />
                </span>
                <p className="wb-account-kicker">ACCOUNT ACTIVE</p>
                <h2 id="account-activation-title">Your WealthBuilder Account is ready.</h2>
                <p>
                  Your self-custodial smart account is connected and ready for policy-guided
                  actions.
                </p>
                <div className="wb-account-address">
                  <small>Account address</small>
                  <code>{smartAccountAddress}</code>
                </div>
                <details>
                  <summary>Advanced details</summary>
                  <p>
                    Network: Avalanche Fuji. This account uses your Wealth Policy to constrain
                    eligible actions.
                  </p>
                </details>
                <button type="button" className="wb-account-primary" onClick={() => setOpen(false)}>
                  Continue
                </button>
              </>
            ) : (
              <>
                <span className="wb-account-dialog-icon">
                  <ShieldCheck />
                </span>
                <p className="wb-account-kicker">WEALTHBUILDER ACCOUNT</p>
                <h2 id="account-activation-title">Activate your account</h2>
                <p>
                  We’ll create your self-custodial smart account so WealthBuilder can prepare
                  actions within your Wealth Policy.
                </p>
                <p className="wb-account-assurance">Your assets stay under your control.</p>
                {error && (
                  <p className="wb-account-error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  className="wb-account-primary"
                  onClick={() => void activate()}
                  disabled={activating}
                >
                  {activating ? 'Activating…' : 'Activate WealthBuilder Account'}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
