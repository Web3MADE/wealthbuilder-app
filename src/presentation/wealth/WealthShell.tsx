'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DevUserSwitcher } from '@/presentation/dev/DevUserSwitcher';
import { DEV_MODE_KEY, resolveDevUserMode } from '@/presentation/dev/dev-user-mode';
import { existingUser } from '@/presentation/dev/seeded-users';
import { WealthIcon, type WealthIconName } from './WealthIcon';
import './wealth-screens.css';

function WealthBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/home"
      className={`wb-brand ${compact ? 'compact' : ''}`}
      aria-label="WealthBuilder home"
    >
      <span>
        <Image src="/assets/WealthBuilder_logo.png" alt="" width={1774} height={887} priority />
      </span>
      <strong>WealthBuilder</strong>
    </Link>
  );
}

export function WealthChat({ mobile = false }: { mobile?: boolean }) {
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState(false);
  const id = mobile ? 'wealth-chat-mobile' : 'wealth-chat-desktop';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim()) setNotice(true);
  }

  return (
    <div className={`wb-chat ${mobile ? 'mobile' : 'desktop'}`}>
      <form onSubmit={submit}>
        <WealthIcon name="spark" size={19} />
        <label className="sr-only" htmlFor={id}>
          Ask WealthBuilder anything
        </label>
        <input
          id={id}
          placeholder="Ask WealthBuilder anything..."
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setNotice(false);
          }}
        />
        <button type="submit" aria-label="Send message">
          <WealthIcon name="send" size={17} />
        </button>
      </form>
      {notice && <p role="status">AI chat is coming soon.</p>}
    </div>
  );
}

const navigation: readonly { href: string; label: string; icon: WealthIconName }[] = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/portfolio', label: 'Portfolio', icon: 'portfolio' },
  { href: '/strategy', label: 'Strategy', icon: 'strategy' },
  { href: '/home#quick-actions', label: 'Explore', icon: 'explore' },
  { href: '/home#activity', label: 'Activity', icon: 'activity' },
];

function WealthSidebar({ active }: { active: 'portfolio' | 'strategy' }) {
  return (
    <aside className="wb-sidebar">
      <WealthBrand />
      <nav aria-label="Main navigation">
        {navigation.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={item.label.toLowerCase() === active ? 'active' : ''}
            aria-current={item.label.toLowerCase() === active ? 'page' : undefined}
          >
            <WealthIcon name={item.icon} />
            {item.label}
          </Link>
        ))}
        <div className="wb-nav-divider" />
        <Link href="/chat">
          <WealthIcon name="chat" />
          AI Chat
        </Link>
      </nav>
      <div className="wb-sidebar-bottom">
        <Link href="/home#account">
          <WealthIcon name="settings" />
          Settings
        </Link>
        <div>
          <span>HK</span>
          {existingUser.name}
          <span>›</span>
        </div>
      </div>
    </aside>
  );
}

function WealthMobileNavigation({ active }: { active: 'portfolio' | 'strategy' }) {
  return (
    <nav className="wb-bottom-nav" aria-label="Mobile navigation">
      <Link href="/home">
        <WealthIcon name="home" size={20} />
        Home
      </Link>
      <Link
        href="/portfolio"
        className={active === 'portfolio' ? 'active' : ''}
        aria-current={active === 'portfolio' ? 'page' : undefined}
      >
        <WealthIcon name="portfolio" size={20} />
        Portfolio
      </Link>
      <Link
        href="/strategy"
        className={active === 'strategy' ? 'active' : ''}
        aria-current={active === 'strategy' ? 'page' : undefined}
      >
        <WealthIcon name="strategy" size={20} />
        Strategy
      </Link>
      <Link href="/home#account">
        <WealthIcon name="settings" size={20} />
        More
      </Link>
    </nav>
  );
}

export function WealthShell({
  active,
  children,
}: {
  active: 'portfolio' | 'strategy';
  children: ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mode = resolveDevUserMode(null, window.localStorage.getItem(DEV_MODE_KEY));
    if (process.env.NODE_ENV === 'production' || mode !== 'existing') {
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

  return (
    <div className="wb-app">
      <WealthSidebar active={active} />
      <div className="wb-body">
        <header className="wb-topbar">
          <div className="wb-mobile-brand">
            <WealthBrand compact />
          </div>
          <WealthChat />
          <button type="button" className="wb-bell" aria-label="Notifications">
            <WealthIcon name="bell" size={20} />
            <i />
          </button>
        </header>
        <main className="wb-content">{children}</main>
      </div>
      <WealthMobileNavigation active={active} />
      <DevUserSwitcher />
    </div>
  );
}
