'use client';

import { ShieldCheck } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import type { SolanaCluster } from '@/infrastructure/solana/solana-config';

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

export function SolanaPolicyPanel({
  address,
  cluster,
  signMessage,
}: {
  address: string;
  cluster: SolanaCluster;
  signMessage: (message: string) => Promise<Uint8Array>;
}) {
  const [form, setForm] = useState(defaultPolicyForm);
  const [authenticated, setAuthenticated] = useState(false);
  const [version, setVersion] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
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
  }, [address, cluster]);

  async function signIn() {
    setNotice('');
    try {
      const challengeResponse = await fetch('/api/solana/auth/challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const challenge = (await challengeResponse.json()) as { message?: string; error?: string };
      if (!challengeResponse.ok || !challenge.message) throw new Error(challenge.error);
      const signature = await signMessage(challenge.message);
      const verifyResponse = await fetch('/api/solana/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, signature: bytesToBase64(signature) }),
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
