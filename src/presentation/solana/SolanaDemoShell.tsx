'use client';

import { ArrowRight, RefreshCw, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SolanaStrategyResult } from '@/application/solana-strategy-service';
import {
  type JitoSolConfirmation,
  type JitoSolExecutionStage,
} from '@/infrastructure/solana/jito-sol-executor';
import type { SolanaPortfolioState } from '@/infrastructure/solana/use-solana-portfolio';
import type { SolanaWalletConnection } from '@/infrastructure/solana/use-solana-wallet';
import type { SolanaCluster } from '@/infrastructure/solana/solana-config';
import { useJitoSolBalance } from '@/infrastructure/solana/use-jito-sol-balance';
import { useJitoSolExecutor } from '@/infrastructure/solana/use-jito-sol-executor';
import {
  defaultSolanaStrategyPreferences,
  loadSolanaStrategyPreferences,
  saveSolanaStrategyPreferences,
  type SolanaStrategyPreferences as SolanaStrategyPreferencesValue,
} from './solana-strategy-preferences';
import { SolanaStrategyPreferences } from './SolanaStrategyPreferences';
import {
  SolanaOpportunityReview,
  SolanaStrategyActive,
  SolanaStrategyRecommendation,
} from './SolanaStrategyRecommendation';
import { SolanaWalletTools } from './SolanaWalletTools';

type DemoState = 'portfolio' | 'preferences' | 'recommendation' | 'review' | 'active';

type ActiveStrategy = Readonly<{
  confirmation: JitoSolConfirmation;
  remainingSolLamports: bigint | null;
  jitoSolLamports: bigint | null;
  refreshMessage: string | null;
}>;

export function SolanaDemoShell({
  wallet,
  cluster,
  portfolio,
}: {
  wallet: SolanaWalletConnection;
  cluster: SolanaCluster;
  portfolio: SolanaPortfolioState;
}) {
  const [state, setState] = useState<DemoState>('portfolio');
  const [preferences, setPreferences] = useState<SolanaStrategyPreferencesValue>(
    defaultSolanaStrategyPreferences,
  );
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [strategy, setStrategy] = useState<SolanaStrategyResult | null>(null);
  const [findingStrategy, setFindingStrategy] = useState(false);
  const [strategyError, setStrategyError] = useState('');
  const [executionStage, setExecutionStage] = useState<JitoSolExecutionStage | null>(null);
  const [executionError, setExecutionError] = useState('');
  const [activeStrategy, setActiveStrategy] = useState<ActiveStrategy | null>(null);
  const executionInFlight = useRef(false);
  const jitoSolBalance = useJitoSolBalance(wallet.address);
  const jitoSolExecutor = useJitoSolExecutor();

  useEffect(() => {
    try {
      setPreferences(loadSolanaStrategyPreferences(window.sessionStorage));
    } catch {
      setPreferences(defaultSolanaStrategyPreferences);
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      saveSolanaStrategyPreferences(window.sessionStorage, preferences);
    } catch {
      // The flow remains usable when browser session storage is unavailable.
    }
  }, [preferences, preferencesLoaded]);

  useEffect(() => {
    if (!wallet.address && executionInFlight.current) {
      setExecutionStage('failed');
      setExecutionError('Your wallet disconnected. Reconnect to review and try again.');
    }
  }, [wallet.address]);

  const position = portfolio.portfolio?.positions[0];
  const balance = position ? formatSol(position.amount.value) : null;
  const network = `Solana ${cluster === 'devnet' ? 'Devnet' : 'Localnet'}`;

  async function connect(walletName: string) {
    setConnectError('');
    try {
      await wallet.connect(walletName);
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : 'Wallet connection failed.');
    }
  }

  async function findStrategy() {
    if (!position || !preferences.timeline || !preferences.risk) return;
    if (!wallet.networkReady) {
      setStrategyError('Switch your wallet to Solana Devnet before finding a strategy.');
      return;
    }
    setFindingStrategy(true);
    setStrategyError('');
    try {
      const response = await fetch('/api/solana/strategy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          goal: preferences.goal,
          timeline: preferences.timeline,
          risk: preferences.risk,
          solBalanceLamports: position.amount.value.toString(),
          cluster,
        }),
      });
      const result = (await response.json()) as SolanaStrategyResult & { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'We could not find a strategy right now.');
      setStrategy(result);
      setState('recommendation');
    } catch (error) {
      setStrategyError(
        error instanceof Error ? error.message : 'We could not find a strategy right now.',
      );
    } finally {
      setFindingStrategy(false);
    }
  }

  async function stakeRecommendation() {
    const recommendation = strategy?.recommendation;
    if (executionInFlight.current) return;
    if (!recommendation || !wallet.address) {
      setExecutionStage('failed');
      setExecutionError('Reconnect your wallet before approving this opportunity.');
      return;
    }
    if (!wallet.networkReady) {
      setExecutionStage('failed');
      setExecutionError('Switch your wallet to Solana Devnet before approving this opportunity.');
      return;
    }
    executionInFlight.current = true;
    setExecutionError('');
    try {
      const nextConfirmation = await jitoSolExecutor.execute({
        opportunityId: recommendation.opportunity.id,
        allocationPercent: recommendation.allocationPercent,
        onStage: setExecutionStage,
      });
      const [refreshedPortfolio, refreshedJitoSol] = await Promise.all([
        portfolio.refresh(),
        jitoSolBalance.refresh(),
      ]);
      setActiveStrategy({
        confirmation: nextConfirmation,
        remainingSolLamports: refreshedPortfolio?.positions[0]?.amount.value ?? null,
        jitoSolLamports: refreshedJitoSol,
        refreshMessage:
          refreshedPortfolio && refreshedJitoSol !== null
            ? null
            : 'Your transaction is confirmed, but one portfolio balance could not be refreshed yet.',
      });
      setState('active');
    } catch (error) {
      setExecutionError(
        error instanceof Error ? error.message : 'We could not complete this JitoSOL deposit.',
      );
    } finally {
      executionInFlight.current = false;
    }
  }

  return (
    <main className="solana-demo-page">
      <div className="solana-demo-shell">
        <header className="solana-demo-header">
          <a href="/solana" className="solana-demo-brand" aria-label="WealthBuilder Solana home">
            <span className="solana-demo-brand-mark">W</span>
            <span>WealthBuilder</span>
          </a>
          <span className="solana-network-chip">{network}</span>
        </header>

        {!wallet.isReady ? (
          <section className="solana-entry-state" aria-live="polite">
            <RefreshCw className="solana-loading-icon" aria-hidden="true" />
            <p>Checking for your wallet…</p>
          </section>
        ) : !wallet.address ? (
          <section className="solana-entry-state" aria-labelledby="solana-entry-title">
            <span className="solana-entry-mark">
              <Wallet size={26} aria-hidden="true" />
            </span>
            <p className="solana-overline">Your wealth, your rules</p>
            <h1 id="solana-entry-title">Build a strategy around your goals.</h1>
            <p>
              Connect your Solana wallet to see your portfolio and define a strategy that fits you.
            </p>
            {wallet.wallets.length ? (
              <div className="solana-connect-options">
                {wallet.wallets.map((availableWallet) => (
                  <button
                    key={availableWallet.name}
                    type="button"
                    className="solana-primary-action"
                    onClick={() => void connect(availableWallet.name)}
                  >
                    {availableWallet.icon ? (
                      // Wallet Standard wallet icons are supplied as safe data URLs.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={availableWallet.icon} alt="" />
                    ) : (
                      <Wallet size={18} aria-hidden="true" />
                    )}
                    Connect {availableWallet.name}
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="solana-entry-muted">
                Install or unlock a Wallet Standard Solana wallet to continue.
              </p>
            )}
            {connectError && (
              <p className="solana-flow-error" role="alert">
                {connectError}
              </p>
            )}
          </section>
        ) : findingStrategy ? (
          <section className="solana-strategy-loading" aria-live="polite">
            <RefreshCw className="solana-loading-icon" aria-hidden="true" />
            <p className="solana-overline">Finding your strategy</p>
            <h1>Matching your goals to eligible opportunities.</h1>
            <ul>
              <li>Understanding your goals</li>
              <li>Checking eligible opportunities</li>
              <li>Finding your best match</li>
            </ul>
          </section>
        ) : state === 'recommendation' && strategy && position ? (
          <SolanaStrategyRecommendation
            result={strategy}
            balanceLamports={position.amount.value}
            retrying={findingStrategy}
            onRetry={() => void findStrategy()}
            onReview={() => setState('review')}
            onBack={() => setState('preferences')}
          />
        ) : state === 'review' && strategy && position ? (
          <SolanaOpportunityReview
            result={strategy}
            balanceLamports={position.amount.value}
            executionStage={executionStage}
            executionError={executionError}
            onStake={() => void stakeRecommendation()}
            onBack={() => setState('recommendation')}
          />
        ) : state === 'active' && activeStrategy ? (
          <SolanaStrategyActive
            depositedLamports={activeStrategy.confirmation.depositedLamports}
            signature={activeStrategy.confirmation.signature}
            remainingSolLamports={activeStrategy.remainingSolLamports}
            jitoSolLamports={activeStrategy.jitoSolLamports}
            refreshMessage={activeStrategy.refreshMessage}
            onPortfolio={() => setState('portfolio')}
          />
        ) : state === 'preferences' && balance ? (
          <SolanaStrategyPreferences
            preferences={preferences}
            balance={balance}
            onChange={setPreferences}
            onBack={() => setState('portfolio')}
            onFind={() => void findStrategy()}
            finding={findingStrategy}
            error={strategyError}
          />
        ) : (
          <section className="solana-portfolio-home" aria-labelledby="solana-portfolio-title">
            <div className="solana-greeting">
              <div>
                <p className="solana-overline">Your portfolio</p>
                <h1 id="solana-portfolio-title">Your strategy starts here.</h1>
              </div>
              <button
                type="button"
                className="solana-disconnect"
                onClick={() => void wallet.disconnect()}
              >
                Disconnect
              </button>
            </div>
            <section className="solana-balance-card" aria-label="Current SOL balance">
              <div className="solana-balance-card-top">
                <span className="solana-asset-mark">S</span>
                <span>SOL balance</span>
                <span>{network}</span>
              </div>
              <strong>
                {portfolio.status === 'ready' && balance
                  ? `${balance} SOL`
                  : portfolio.status === 'error'
                    ? 'Balance unavailable'
                    : 'Reading your balance…'}
              </strong>
              <div className="solana-wallet-detail">
                <span>Connected wallet</span>
                <code>{shortenedAddress(wallet.address)}</code>
              </div>
            </section>
            {portfolio.status === 'error' ? (
              <button type="button" className="solana-secondary-action" onClick={portfolio.refresh}>
                Try again
              </button>
            ) : (
              <button
                type="button"
                className="solana-primary-action"
                disabled={portfolio.status !== 'ready' || !balance || !wallet.networkReady}
                onClick={() => setState('preferences')}
              >
                Build my strategy <ArrowRight size={18} aria-hidden="true" />
              </button>
            )}
            {!wallet.networkReady && (
              <p className="solana-flow-error" role="alert">
                Switch your wallet to Solana Devnet to continue.
              </p>
            )}
            <SolanaWalletTools
              address={wallet.address}
              balanceLamports={position?.amount.value ?? null}
              canSignTransactions={wallet.canSignTransactions}
              cluster={cluster}
              portfolioId={portfolio.portfolio?.id ?? `${cluster}:${wallet.address}`}
              signMessage={wallet.signMessage}
              onConfirmed={portfolio.refresh}
            />
          </section>
        )}
      </div>
    </main>
  );
}

function shortenedAddress(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function formatSol(lamports: bigint) {
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
