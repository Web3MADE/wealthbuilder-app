'use client';

import Link from 'next/link';
import { RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useSolanaCluster } from '@/infrastructure/solana/solana-provider';
import { useSolanaPortfolio } from '@/infrastructure/solana/use-solana-portfolio';
import { useSolanaWallet } from '@/infrastructure/solana/use-solana-wallet';
import { SolanaTransferPanel } from './SolanaTransferPanel';
import './solana-wallet.css';

function shortenedAddress(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function SolanaWalletScreen() {
  const { cluster, setCluster } = useSolanaCluster();
  const wallet = useSolanaWallet();
  const solanaPortfolio = useSolanaPortfolio(wallet.address);
  const solPosition = solanaPortfolio.portfolio?.positions[0];

  return (
    <main className="solana-wallet-page">
      <header className="solana-wallet-header">
        <div>
          <p className="solana-wallet-eyebrow">WealthBuilder · Solana foundation</p>
          <h1>Solana wallet</h1>
          <p>Connect a Wallet Standard wallet to read its SOL balance.</p>
        </div>
        <Link href="/home" className="solana-wallet-back">
          Back to WealthBuilder
        </Link>
      </header>

      <section className="solana-wallet-card" aria-labelledby="solana-connection-title">
        <div className="solana-wallet-card-header">
          <div>
            <p className="solana-wallet-eyebrow">Network</p>
            <h2 id="solana-connection-title">Solana {cluster}</h2>
          </div>
          <label>
            <span className="sr-only">Solana network</span>
            <select
              value={cluster}
              onChange={(event) => setCluster(event.target.value as typeof cluster)}
            >
              <option value="devnet">Devnet</option>
              <option value="localnet">Localnet</option>
            </select>
          </label>
        </div>

        {!wallet.isReady ? (
          <p className="solana-wallet-status" role="status">
            <RefreshCw aria-hidden="true" /> Restoring wallet connection…
          </p>
        ) : wallet.address ? (
          <div className="solana-wallet-connected">
            <div>
              <p className="solana-wallet-eyebrow">Connected address</p>
              <code title={wallet.address}>{shortenedAddress(wallet.address)}</code>
            </div>
            <div>
              <p className="solana-wallet-eyebrow">SOL balance</p>
              <strong>
                {solanaPortfolio.status === 'ready' && solPosition
                  ? `${formatSol(solPosition.amount.value)} SOL`
                  : solanaPortfolio.status === 'error'
                    ? 'Unavailable'
                    : 'Loading…'}
              </strong>
            </div>
            <button
              type="button"
              className="solana-wallet-secondary"
              onClick={() => void wallet.disconnect()}
            >
              Disconnect
            </button>
            <div className="solana-wallet-position">
              <p className="solana-wallet-eyebrow">Portfolio position</p>
              {solanaPortfolio.status === 'ready' && solPosition ? (
                <p>
                  {solPosition.asset.symbol} · {solPosition.location.toLowerCase()} ·{' '}
                  {solPosition.amount.value.toString()} lamports
                </p>
              ) : solanaPortfolio.status === 'error' ? (
                <p>Portfolio could not be read from {cluster}.</p>
              ) : (
                <p>Creating SOL wallet position…</p>
              )}
            </div>
            <SolanaTransferPanel
              walletAddress={wallet.address}
              balanceLamports={
                solanaPortfolio.status === 'ready' ? (solPosition?.amount.value ?? null) : null
              }
              canSignTransactions={wallet.canSignTransactions}
              cluster={cluster}
              portfolioId={solanaPortfolio.portfolio?.id ?? `${cluster}:${wallet.address}`}
              onConfirmed={solanaPortfolio.refresh}
            />
            <SolanaPolicyPanel wallet={wallet} cluster={cluster} />
          </div>
        ) : (
          <div className="solana-wallet-options">
            <p>Choose a detected wallet to connect.</p>
            {wallet.wallets.length ? (
              <div>
                {wallet.wallets.map((availableWallet) => (
                  <button
                    key={availableWallet.name}
                    type="button"
                    onClick={() => void wallet.connect(availableWallet.name)}
                  >
                    {availableWallet.icon && (
                      // Wallet Standard wallet icons are supplied as safe data URLs.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={availableWallet.icon} alt="" />
                    )}
                    <Wallet aria-hidden="true" />
                    Connect {availableWallet.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="solana-wallet-muted">No Wallet Standard Solana wallet detected.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

type SolanaPolicyForm = {
  allowedSol: boolean;
  maxSingleTransactionUsd: string;
  maxAutonomousTransactionUsd: string;
  maxAssetConcentrationPercent: string;
  minimumLiquidStableReservePercent: string;
  autonomyEnabled: boolean;
};

const defaultPolicyForm: SolanaPolicyForm = {
  allowedSol: true,
  maxSingleTransactionUsd: '1000',
  maxAutonomousTransactionUsd: '0',
  maxAssetConcentrationPercent: '100',
  minimumLiquidStableReservePercent: '0',
  autonomyEnabled: false,
};

function SolanaPolicyPanel({
  wallet,
  cluster,
}: {
  wallet: ReturnType<typeof useSolanaWallet>;
  cluster: 'devnet' | 'localnet';
}) {
  const [form, setForm] = useState(defaultPolicyForm);
  const [authenticated, setAuthenticated] = useState(false);
  const [version, setVersion] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!wallet.address) return;
    setAuthenticated(false);
    setVersion(null);
    void fetch(`/api/solana/policy?cluster=${cluster}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{
          policy: (SolanaPolicyForm & { version: number }) | null;
        }>;
      })
      .then((result) => {
        if (!result) return;
        setAuthenticated(true);
        if (result.policy) {
          setForm(result.policy);
          setVersion(result.policy.version);
        }
      });
  }, [cluster, wallet.address]);

  async function signIn() {
    if (!wallet.address) return;
    setNotice('');
    try {
      const challengeResponse = await fetch('/api/solana/auth/challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: wallet.address }),
      });
      const challenge = (await challengeResponse.json()) as { message?: string; error?: string };
      if (!challengeResponse.ok || !challenge.message) throw new Error(challenge.error);
      const signature = await wallet.signMessage(challenge.message);
      const verifyResponse = await fetch('/api/solana/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: wallet.address, signature: bytesToBase64(signature) }),
      });
      const result = (await verifyResponse.json()) as { error?: string };
      if (!verifyResponse.ok) throw new Error(result.error);
      setAuthenticated(true);
      setNotice('Solana wallet signed in for policy settings.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Solana policy sign-in failed.');
    }
  }

  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    const response = await fetch('/api/solana/policy', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, cluster }),
    });
    const result = (await response.json()) as {
      policy?: SolanaPolicyForm & { version: number };
      error?: string;
    };
    if (!response.ok || !result.policy) {
      setNotice(result.error ?? 'Policy could not be saved.');
      return;
    }
    setForm(result.policy);
    setVersion(result.policy.version);
    setNotice(`Saved policy version ${result.policy.version}.`);
  }

  return (
    <section className="solana-policy-panel" aria-labelledby="solana-policy-title">
      <div>
        <p className="solana-wallet-eyebrow">Personal Wealth Policy</p>
        <h3 id="solana-policy-title">SOL policy · {cluster}</h3>
        <p>Native SOL context only. Transfer execution is not yet evaluated against this policy.</p>
      </div>
      {!authenticated ? (
        <button type="button" className="solana-wallet-secondary" onClick={() => void signIn()}>
          <ShieldCheck aria-hidden="true" /> Sign in to save policy
        </button>
      ) : (
        <form onSubmit={savePolicy}>
          <label>
            <input
              type="checkbox"
              checked={form.allowedSol}
              onChange={(event) => setForm({ ...form, allowedSol: event.target.checked })}
            />
            Allow SOL
          </label>
          <label>
            Max transaction (USD)
            <input
              value={form.maxSingleTransactionUsd}
              onChange={(event) =>
                setForm({ ...form, maxSingleTransactionUsd: event.target.value })
              }
            />
          </label>
          <label>
            Max exposure (%)
            <input
              value={form.maxAssetConcentrationPercent}
              onChange={(event) =>
                setForm({ ...form, maxAssetConcentrationPercent: event.target.value })
              }
            />
          </label>
          <label>
            Minimum liquid reserve (%)
            <input
              value={form.minimumLiquidStableReservePercent}
              onChange={(event) =>
                setForm({ ...form, minimumLiquidStableReservePercent: event.target.value })
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.autonomyEnabled}
              onChange={(event) => setForm({ ...form, autonomyEnabled: event.target.checked })}
            />
            Allow autonomous actions when supported
          </label>
          <label>
            Autonomous limit (USD)
            <input
              value={form.maxAutonomousTransactionUsd}
              onChange={(event) =>
                setForm({ ...form, maxAutonomousTransactionUsd: event.target.value })
              }
            />
          </label>
          <button type="submit">Save SOL policy{version ? ` · v${version}` : ''}</button>
        </form>
      )}
      {notice && (
        <p className="solana-policy-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}

function bytesToBase64(value: Uint8Array) {
  let encoded = '';
  for (const byte of value) encoded += String.fromCharCode(byte);
  return btoa(encoded);
}

function formatSol(lamports: bigint) {
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
