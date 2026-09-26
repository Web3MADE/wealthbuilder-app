'use client';

import Link from 'next/link';
import { RefreshCw, Wallet } from 'lucide-react';
import { useSolanaCluster } from '@/infrastructure/solana/solana-provider';
import { useSolanaPortfolio } from '@/infrastructure/solana/use-solana-portfolio';
import { useSolanaWallet } from '@/infrastructure/solana/use-solana-wallet';
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

function formatSol(lamports: bigint) {
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
