'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { WalletConnection } from '@/application/interfaces/wallet';

type View = 'home' | 'portfolio' | 'policy';
type PortfolioView = {
  wallet: string;
  network: string;
  estimatedUsdMicros: string;
  positions: {
    assetId: string;
    symbol: string;
    amountAtomic: string;
    decimals: number;
    estimatedUsdMicros: string;
  }[];
  pricingNote: string;
};
type PolicyView = {
  id: string;
  version: number;
  wallet: string;
  allowedAssetIds: string[];
  excludedAssetIds: string[];
  allowedProtocolIds: string[];
  maxSingleTransactionUsd: string;
  maxAutonomousTransactionUsd: string;
  maxAssetConcentrationPercent: string;
  minimumLiquidStableReservePercent: string;
  autonomyEnabled: boolean;
};
type PolicyForm = Omit<
  PolicyView,
  'id' | 'version' | 'wallet' | 'allowedAssetIds' | 'excludedAssetIds' | 'allowedProtocolIds'
> & {
  allowedAssetIds: string;
  excludedAssetIds: string;
  allowedProtocolIds: string;
};
const defaultForm: PolicyForm = {
  allowedAssetIds: 'avax, usdc',
  excludedAssetIds: '',
  allowedProtocolIds: 'aave-v3',
  maxSingleTransactionUsd: '1000',
  maxAutonomousTransactionUsd: '100',
  maxAssetConcentrationPercent: '100',
  minimumLiquidStableReservePercent: '20',
  autonomyEnabled: false,
};

function displayAmount(atomic: string, decimals: number): string {
  const padded = atomic.padStart(decimals + 1, '0');
  const whole = decimals ? padded.slice(0, -decimals) : padded;
  const fraction = decimals ? padded.slice(-decimals).replace(/0+$/, '').slice(0, 6) : '';
  return fraction ? `${whole}.${fraction}` : whole;
}

function policyToForm(policy: PolicyView): PolicyForm {
  return {
    allowedAssetIds: policy.allowedAssetIds.join(', '),
    excludedAssetIds: policy.excludedAssetIds.join(', '),
    allowedProtocolIds: policy.allowedProtocolIds.join(', '),
    maxSingleTransactionUsd: policy.maxSingleTransactionUsd,
    maxAutonomousTransactionUsd: policy.maxAutonomousTransactionUsd,
    maxAssetConcentrationPercent: policy.maxAssetConcentrationPercent,
    minimumLiquidStableReservePercent: policy.minimumLiquidStableReservePercent,
    autonomyEnabled: policy.autonomyEnabled,
  };
}

export function AppShell({ view, wallet }: { view: View; wallet: WalletConnection }) {
  const { address, chainId, status } = wallet;
  const [sessionWallet, setSessionWallet] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioView | null>(null);
  const [policy, setPolicy] = useState<PolicyView | null>(null);
  const [form, setForm] = useState<PolicyForm>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    const [portfolioResponse, policyResponse] = await Promise.all([
      fetch('/api/portfolio', { cache: 'no-store' }),
      fetch('/api/policy', { cache: 'no-store' }),
    ]);
    if (portfolioResponse.ok) {
      const data = (await portfolioResponse.json()) as PortfolioView;
      setPortfolio(data);
    } else {
      setPortfolio(null);
      setNotice(
        ((await portfolioResponse.json()) as { error?: string }).error ?? 'Portfolio read failed.',
      );
    }
    if (policyResponse.ok) {
      const data = (await policyResponse.json()) as { policy: PolicyView | null };
      setPolicy(data.policy);
      setForm(data.policy ? policyToForm(data.policy) : defaultForm);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { wallet: string | null }) => {
        if (active) setSessionWallet(data.wallet);
      })
      .catch(() => {
        if (active) setNotice('Session check failed.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (sessionWallet) void loadData();
  }, [sessionWallet, loadData]);

  async function connectWallet() {
    setNotice('');
    try {
      await wallet.connect();
    } catch {
      setNotice('Wallet connection failed.');
    }
  }

  async function authenticate() {
    if (!address || chainId !== 43113) return;
    setBusy(true);
    setNotice('');
    try {
      const challengeResponse = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const challenge = (await challengeResponse.json()) as { message?: string; error?: string };
      if (!challengeResponse.ok || !challenge.message)
        throw new Error(challenge.error ?? 'Challenge failed.');
      const signature = await wallet.sign(challenge.message);
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: challenge.message, signature }),
      });
      const result = (await verifyResponse.json()) as { wallet?: string; error?: string };
      if (!verifyResponse.ok || !result.wallet)
        throw new Error(result.error ?? 'Signature verification failed.');
      setSessionWallet(result.wallet);
      setNotice('Wallet authenticated.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Wallet authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  async function disconnectWallet() {
    await fetch('/api/auth/logout', { method: 'POST' });
    await wallet.disconnect();
    setSessionWallet(null);
    setPortfolio(null);
    setPolicy(null);
    setForm(defaultForm);
    setNotice('Disconnected.');
  }

  async function savePolicy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setNotice('');
    const list = (value: string) =>
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    try {
      const response = await fetch('/api/policy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          allowedAssetIds: list(form.allowedAssetIds),
          excludedAssetIds: list(form.excludedAssetIds),
          allowedProtocolIds: list(form.allowedProtocolIds),
        }),
      });
      const result = (await response.json()) as {
        policy?: PolicyView;
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok || !result.policy) {
        setErrors(result.errors ?? {});
        setNotice(result.error ?? 'Please correct the policy fields.');
        return;
      }
      setPolicy(result.policy);
      setForm(policyToForm(result.policy));
      setNotice(`Policy saved (version ${result.policy.version}).`);
    } catch {
      setNotice('Policy save failed.');
    } finally {
      setBusy(false);
    }
  }

  const wrongChain = Boolean(address && chainId !== 43113);
  const authenticated = Boolean(
    sessionWallet && address && sessionWallet === address.toLowerCase() && !wrongChain,
  );
  const navigation = [
    { href: '/', label: 'Home', key: 'home' },
    { href: '/portfolio', label: 'Portfolio', key: 'portfolio' },
    { href: '/policy', label: 'Policy', key: 'policy' },
  ];
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">WealthBuilder</h1>
          <p className="text-sm text-[var(--muted)]">Avalanche Fuji testnet</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {address && (
            <span className="text-sm" title={address}>
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          )}
          {!address ? (
            <button className="action" onClick={connectWallet}>
              Connect wallet
            </button>
          ) : (
            <button className="action-secondary" onClick={disconnectWallet}>
              Disconnect
            </button>
          )}
        </div>
      </header>
      <nav className="my-5 flex gap-2" aria-label="Main navigation">
        {navigation.map((item) => (
          <Link
            className={`nav-link ${view === item.key ? 'nav-active' : ''}`}
            href={item.href}
            key={item.key}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {notice && (
        <p role="status" className="mb-4 rounded-lg border border-[var(--line)] p-3 text-sm">
          {notice}
        </p>
      )}
      {status === 'reconnecting' && <p className="mb-4 text-sm">Reconnecting wallet…</p>}
      {wrongChain && (
        <section className="panel mb-4">
          <h2 className="font-semibold">Wrong network</h2>
          <p className="my-2 text-sm text-[var(--muted)]">
            Switch your wallet to Avalanche Fuji (chain 43113).
          </p>
          <button
            className="action"
            onClick={() =>
              void wallet.switchToFuji().catch(() => setNotice('Network switch was declined.'))
            }
          >
            Switch to Fuji
          </button>
        </section>
      )}
      {address && !wrongChain && !authenticated && (
        <section className="panel mb-4">
          <h2 className="font-semibold">Authenticate wallet</h2>
          <p className="my-2 text-sm text-[var(--muted)]">
            Sign a message to load your private policy. No transaction is sent.
          </p>
          <button className="action" disabled={busy} onClick={() => void authenticate()}>
            {busy ? 'Waiting for signature…' : 'Sign in with wallet'}
          </button>
        </section>
      )}
      {!address && (
        <section className="panel">
          <p>Connect an EVM wallet to view your Fuji portfolio and policy.</p>
        </section>
      )}
      {authenticated && view === 'home' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="panel">
            <h2 className="font-semibold">Portfolio</h2>
            <p className="mt-2 text-2xl">
              {portfolio ? `$${displayAmount(portfolio.estimatedUsdMicros, 6)}` : 'Loading…'}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Configured test USDC estimate; AVAX is unpriced.
            </p>
            <Link className="text-link" href="/portfolio">
              View balances →
            </Link>
          </section>
          <section className="panel">
            <h2 className="font-semibold">Personal Wealth Policy</h2>
            <p className="mt-2 text-2xl">
              {policy ? `Active · v${policy.version}` : 'No policy saved'}
            </p>
            <Link className="text-link" href="/policy">
              {policy ? 'Edit policy' : 'Create policy'} →
            </Link>
          </section>
          <section className="panel sm:col-span-2">
            <h2 className="font-semibold">Wallet and network</h2>
            <p className="mt-2 break-all text-sm">{address}</p>
            <p className="text-sm text-[var(--muted)]">
              Avalanche Fuji · connected and authenticated
            </p>
          </section>
        </div>
      )}
      {authenticated && view === 'portfolio' && (
        <section className="panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Fuji portfolio</h2>
              <p className="break-all text-sm text-[var(--muted)]">{address}</p>
            </div>
            <button className="action-secondary" onClick={() => void loadData()}>
              Refresh balances
            </button>
          </div>
          <p className="my-4 text-sm text-[var(--muted)]">{portfolio?.pricingNote}</p>
          <div className="space-y-2">
            {portfolio?.positions.map((position) => (
              <div
                className="flex justify-between gap-3 border-t border-[var(--line)] py-3"
                key={position.assetId}
              >
                <span>{position.symbol}</span>
                <span>{displayAmount(position.amountAtomic, position.decimals)}</span>
              </div>
            )) ?? <p>Loading balances…</p>}
          </div>
        </section>
      )}
      {authenticated && view === 'policy' && (
        <section className="panel">
          <h2 className="text-lg font-semibold">Personal Wealth Policy</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {policy ? `Saved version ${policy.version}` : 'Create your first policy'}
          </p>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => void savePolicy(event)}
          >
            {(
              [
                ['allowedAssetIds', 'Allowed assets (comma separated)'],
                ['excludedAssetIds', 'Excluded assets (comma separated)'],
                ['allowedProtocolIds', 'Allowed protocols (comma separated)'],
                ['maxSingleTransactionUsd', 'Maximum single transaction (USD)'],
                ['maxAutonomousTransactionUsd', 'Maximum autonomous transaction (USD)'],
                ['maxAssetConcentrationPercent', 'Maximum asset concentration (%)'],
                ['minimumLiquidStableReservePercent', 'Minimum liquid stablecoin reserve (%)'],
              ] as const
            ).map(([key, label]) => (
              <label className="block text-sm" key={key}>
                {label}
                <input
                  className="field mt-1"
                  value={form[key]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
                {errors[key] && (
                  <span className="mt-1 block text-[var(--danger)]">{errors[key]}</span>
                )}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.autonomyEnabled}
                onChange={(event) => setForm({ ...form, autonomyEnabled: event.target.checked })}
              />{' '}
              Enable autonomous allowance
            </label>
            <div className="sm:col-span-2">
              <button className="action" disabled={busy} type="submit">
                {busy ? 'Saving…' : 'Save policy'}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
