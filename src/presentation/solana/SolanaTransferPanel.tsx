'use client';

import { type FormEvent, useEffect, useState } from 'react';
import type { TransferAction } from '@/domain';
import type { SolanaCluster } from '@/infrastructure/solana/solana-config';
import {
  normalizeSolTransferAction,
  type SolanaTransferConfirmation,
} from '@/infrastructure/solana/solana-transfer';
import { useSolanaTransferExecutor } from '@/infrastructure/solana/use-solana-transfer';

type TransferStage =
  'editing' | 'review' | 'simulating' | 'ready' | 'signing' | 'confirmed' | 'failed';

export function SolanaTransferPanel({
  walletAddress,
  balanceLamports,
  canSignTransactions,
  cluster,
  portfolioId,
  onConfirmed,
}: {
  walletAddress: string;
  balanceLamports: bigint | null;
  canSignTransactions: boolean;
  cluster: SolanaCluster;
  portfolioId: string;
  onConfirmed: () => void;
}) {
  const executor = useSolanaTransferExecutor();
  const [recipient, setRecipient] = useState('');
  const [amountSol, setAmountSol] = useState('');
  const [action, setAction] = useState<TransferAction | null>(null);
  const [stage, setStage] = useState<TransferStage>('editing');
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<SolanaTransferConfirmation | null>(null);

  useEffect(() => {
    setAction(null);
    setConfirmation(null);
    setNotice('');
    setStage('editing');
  }, [cluster, walletAddress]);

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    try {
      if (balanceLamports === null) throw new Error('Wait for the confirmed SOL balance to load.');
      const next = normalizeSolTransferAction({
        sender: walletAddress,
        recipient,
        amountSol,
        cluster,
        portfolioId,
      });
      if (next.amount.value >= balanceLamports)
        throw new Error('Insufficient SOL balance after reserving network fees.');
      setAction(next);
      setStage('review');
    } catch (error) {
      setStage('failed');
      setNotice(error instanceof Error ? error.message : 'Check the transfer details.');
    }
  }

  async function simulate() {
    if (!action) return;
    setNotice('');
    setStage('simulating');
    try {
      await executor.simulate(action);
      setStage('ready');
      setNotice('Simulation succeeded. Approve the exact transfer in your wallet to submit it.');
    } catch (error) {
      setStage('failed');
      setNotice(error instanceof Error ? error.message : 'Simulation could not be completed.');
    }
  }

  async function approveAndSend() {
    if (!action) return;
    setNotice('');
    setStage('signing');
    try {
      const result = await executor.submit(action.id);
      setConfirmation(result);
      setStage('confirmed');
      setNotice('Transfer confirmed. Refreshing the SOL portfolio balance.');
      onConfirmed();
    } catch (error) {
      setStage('failed');
      setNotice(error instanceof Error ? error.message : 'The transfer was not confirmed.');
    }
  }

  function reset() {
    setAction(null);
    setConfirmation(null);
    setNotice('');
    setStage('editing');
  }

  return (
    <section className="solana-transfer-panel" aria-labelledby="solana-transfer-title">
      <div>
        <p className="solana-wallet-eyebrow">Execution preview</p>
        <h3 id="solana-transfer-title">Send native SOL</h3>
        <p>Simulation is required before your wallet can approve a transfer.</p>
      </div>

      {!canSignTransactions ? (
        <p className="solana-transfer-error">The connected wallet cannot approve transactions.</p>
      ) : null}

      {canSignTransactions && (stage === 'editing' || stage === 'failed') ? (
        <form onSubmit={review}>
          <label>
            Recipient
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="Solana address"
              spellCheck={false}
            />
          </label>
          <label>
            Amount (SOL)
            <input
              value={amountSol}
              onChange={(event) => setAmountSol(event.target.value)}
              inputMode="decimal"
              placeholder="0.01"
            />
          </label>
          <button type="submit">Review transfer</button>
        </form>
      ) : canSignTransactions && action ? (
        <div className="solana-transfer-review">
          <dl>
            <div>
              <dt>Action</dt>
              <dd>Transfer SOL</dd>
            </div>
            <div>
              <dt>Recipient</dt>
              <dd>
                <code>{action.recipient}</code>
              </dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{formatSol(action.amount.value)} SOL</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>Solana {cluster}</dd>
            </div>
          </dl>
          {stage === 'review' && (
            <button type="button" onClick={() => void simulate()}>
              Simulate transfer
            </button>
          )}
          {stage === 'simulating' && <p>Simulating on Solana {cluster}…</p>}
          {stage === 'ready' && (
            <button type="button" onClick={() => void approveAndSend()}>
              Approve and send
            </button>
          )}
          {stage === 'signing' && <p>Waiting for wallet approval and network confirmation…</p>}
          {stage === 'confirmed' && confirmation && (
            <p>
              Confirmed · <code>{shortReference(confirmation.reference)}</code>
            </p>
          )}
          {(stage === 'review' || stage === 'ready' || stage === 'confirmed') && (
            <button type="button" className="solana-wallet-secondary" onClick={reset}>
              New transfer
            </button>
          )}
        </div>
      ) : null}

      {notice && (
        <p
          className={stage === 'failed' ? 'solana-transfer-error' : 'solana-policy-notice'}
          role="status"
        >
          {notice}
        </p>
      )}
    </section>
  );
}

function shortReference(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

function formatSol(lamports: bigint) {
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
