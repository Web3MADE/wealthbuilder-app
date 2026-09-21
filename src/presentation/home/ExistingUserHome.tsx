'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DevUserSwitcher } from '@/presentation/dev/DevUserSwitcher';
import { DEV_MODE_KEY, resolveDevUserMode } from '@/presentation/dev/dev-user-mode';
import { existingUser } from '@/presentation/dev/seeded-users';
import { useActivePolicy } from '@/presentation/wealth/use-active-policy';
import { useFujiPortfolio } from '@/presentation/wealth/use-fuji-portfolio';
import { HomeActivityCard } from './HomeActivityCard';
import { HomeChatBar } from './HomeChatBar';
import { HomeGoalCard } from './HomeGoalCard';
import { HomeHeader } from './HomeHeader';
import { HomeHero } from './HomeHero';
import { HomeMobileNavigation } from './HomeMobileNavigation';
import { HomeMobilePolicyCard, HomePolicyCard } from './HomePolicyCards';
import { HomePortfolioCard } from './HomePortfolioCard';
import { HomeQuickActions } from './HomeQuickActions';
import { HomeSidebar } from './HomeSidebar';
import './home.css';

export function ExistingUserHome() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const { portfolio, error: portfolioError } = useFujiPortfolio();
  const { policy } = useActivePolicy();

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.replace('/onboarding');
      return;
    }

    const mode = resolveDevUserMode(null, window.localStorage.getItem(DEV_MODE_KEY));
    if (mode !== 'existing') {
      router.replace('/onboarding');
      return;
    }

    queueMicrotask(() => setReady(true));
  }, [router]);

  if (!ready) {
    return (
      <main className="entry-gate">
        <p>Opening WealthBuilder…</p>
      </main>
    );
  }

  const firstName = existingUser.name.split(' ')[0] ?? existingUser.name;

  return (
    <div className="wealth-home">
      <HomeSidebar />

      <div className="home-page">
        <HomeHeader />

        <main className="home-main">
          <div className="home-columns">
            <div className="home-primary">
              <HomeHero name={firstName} />

              <div className="home-mobile-connected">
                <i />
                <span>
                  <strong>Connected</strong>
                  <small>
                    {portfolio
                      ? `${portfolio.wallet.slice(0, 6)}…${portfolio.wallet.slice(-4)}`
                      : 'Fuji account loading…'}
                  </small>
                </span>
                <span aria-hidden="true">›</span>
              </div>

              <HomePortfolioCard portfolio={portfolio} error={portfolioError} />
              <HomeMobilePolicyCard policy={policy} />
              <HomeQuickActions />

              <div id="ask-mobile">
                <HomeChatBar id="ask-input-mobile" mobile />
              </div>
            </div>

            <div className="home-sidecards">
              <HomeGoalCard />
              <HomePolicyCard policy={policy} />
              <HomeActivityCard />
            </div>
          </div>
        </main>
      </div>

      <HomeMobileNavigation />
      <DevUserSwitcher />
    </div>
  );
}
