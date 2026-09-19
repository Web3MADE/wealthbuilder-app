'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Landmark,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Card, Button } from './components';
import { useDemoDecision } from '../recommendations/use-demo-decision';

type PolicyForm = { reserveBps: number; autonomousLimit: number };

export default function Dashboard() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState(10);
  const [executed, setExecuted] = useState(false);
  const { register, watch } = useForm<PolicyForm>({
    defaultValues: { reserveBps: 2_000, autonomousLimit: 25 },
  });
  const values = watch();
  const decision = useDemoDecision({
    amountUsdc: amount,
    reserveBps: values.reserveBps,
    autonomousLimitUsdc: values.autonomousLimit,
  });

  async function connectWallet() {
    const provider = (
      window as Window & {
        ethereum?: { request: (request: { method: string }) => Promise<string[]> };
      }
    ).ethereum;
    if (!provider) return;
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    if (account) setWalletAddress(account);
  }

  const isBlocked = decision?.outcome === 'BLOCKED';
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:px-8">
      <header className="mb-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-[#07140f]">
            <Landmark size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">WealthBuilder</h1>
            <p className="text-sm text-[var(--muted)]">Policy-controlled wealth building</p>
          </div>
        </div>
        <Button onClick={connectWallet} className="flex items-center gap-2">
          {' '}
          <Wallet size={16} />{' '}
          {walletAddress
            ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
            : 'Connect wallet'}{' '}
        </Button>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-[var(--muted)]">Network</p>
          <p className="mt-2 font-semibold">Avalanche Fuji</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Execution testnet</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Portfolio</p>
          <p className="mt-2 text-2xl font-bold">$100.00</p>
          <p className="mt-1 text-xs text-[var(--muted)]">100 USDC liquid</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Policy status</p>
          <p className="mt-2 flex items-center gap-2 font-semibold text-[var(--accent)]">
            <ShieldCheck size={18} /> Active · v1
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Deterministic checks enabled</p>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--accent)]" />
            <h2 className="font-bold">Personal Wealth Policy</h2>
          </div>
          <label className="mb-5 block text-sm text-[var(--muted)]">
            Minimum liquid stablecoin reserve{' '}
            <span className="float-right text-[var(--foreground)]">
              {(values.reserveBps / 100).toFixed(0)}%
            </span>
            <input
              className="mt-2 w-full accent-[var(--accent)]"
              type="range"
              min="0"
              max="8000"
              step="500"
              {...register('reserveBps', { valueAsNumber: true })}
            />
          </label>
          <label className="mb-5 block text-sm text-[var(--muted)]">
            AI autonomy per transaction{' '}
            <span className="float-right text-[var(--foreground)]">${values.autonomousLimit}</span>
            <input
              className="mt-2 w-full accent-[var(--accent)]"
              type="range"
              min="0"
              max="100"
              step="5"
              {...register('autonomousLimit', { valueAsNumber: true })}
            />
          </label>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-3 text-sm">
            <p className="font-medium">Approved scope</p>
            <p className="mt-1 text-[var(--muted)]">USDC · Aave V3 Fuji · up to $100/action</p>
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-[var(--accent)]" />
              <h2 className="font-bold">AI recommendation</h2>
            </div>
            <span className="rounded-full border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]">
              Structured output
            </span>
          </div>
          <p className="text-lg font-semibold">Supply {amount} USDC to Aave V3</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Move a bounded portion of idle test USDC into an approved lending protocol while
            retaining your configured liquidity reserve.
          </p>
          <div className="my-5 flex gap-2">
            <button
              onClick={() => {
                setAmount(10);
                setExecuted(false);
              }}
              className={`rounded-lg px-3 py-2 text-sm ${amount === 10 ? 'bg-[var(--surface-raised)] text-[var(--accent)]' : 'text-[var(--muted)]'}`}
            >
              Allowed example
            </button>
            <button
              onClick={() => {
                setAmount(90);
                setExecuted(false);
              }}
              className={`rounded-lg px-3 py-2 text-sm ${amount === 90 ? 'bg-[var(--surface-raised)] text-[var(--danger)]' : 'text-[var(--muted)]'}`}
            >
              Rejected example
            </button>
          </div>
          <div
            className={`rounded-xl border p-4 ${isBlocked ? 'border-[var(--danger)]/50 bg-red-950/20' : 'border-[var(--accent)]/40 bg-lime-950/20'}`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {isBlocked ? (
                <XCircle size={18} className="text-[var(--danger)]" />
              ) : (
                <CheckCircle2 size={18} className="text-[var(--accent)]" />
              )}
              {isBlocked
                ? 'Blocked by policy'
                : decision?.outcome === 'AUTONOMOUS_ALLOWED'
                  ? 'Autonomous execution allowed'
                  : 'Allowed with approval'}
            </div>
            <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
              {isBlocked ? (
                decision?.violations.map((item) => <li key={item.code}>• {item.message}</li>)
              ) : (
                <>
                  <li>• Asset and protocol are allowlisted.</li>
                  <li>
                    • Transaction value: $
                    {(Number(decision?.actionValueMicros ?? '0') / 1_000_000).toFixed(2)}
                  </li>
                  <li>• Your liquid reserve remains compliant.</li>
                </>
              )}
            </ul>
          </div>
          {!isBlocked && (
            <Button
              onClick={() => setExecuted(true)}
              className="mt-5 flex w-full items-center justify-center gap-2"
            >
              <ArrowUpRight size={17} />{' '}
              {executed ? 'Execution prepared — wallet signature next' : 'Prepare secure execution'}
            </Button>
          )}
          {executed && (
            <p className="mt-3 text-center text-sm text-[var(--muted)]">
              The adapter will simulate the allowlisted Aave approval and supply calls before the
              wallet is asked to sign.
            </p>
          )}
        </Card>
      </section>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Audit trail</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Every recommendation retains its policy and portfolio evidence.
            </p>
          </div>
          <span className="text-sm text-[var(--muted)]">Demo mode</span>
        </div>
        <div className="mt-4 border-t border-[var(--line)] pt-4 text-sm">
          <span className="mr-3 rounded bg-[var(--surface-raised)] px-2 py-1 text-xs">AI</span>
          Generated a normalized SUPPLY recommendation{' '}
          <span className="mx-2 text-[var(--muted)]">→</span>
          <span className="mr-3 rounded bg-[var(--surface-raised)] px-2 py-1 text-xs">POLICY</span>
          Evaluated against policy v1
        </div>
      </Card>
    </main>
  );
}
