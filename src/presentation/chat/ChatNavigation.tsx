import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  Compass,
  Home,
  MessageCircle,
  MoreHorizontal,
  PieChart,
  Settings,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

function ChatBrand({ mobile = false }: { mobile?: boolean }) {
  return (
    <Link href="/home" className="chat-brand" aria-label="WealthBuilder home">
      <span className="chat-brand-mark">
        <Image src="/assets/WealthBuilder_logo.png" alt="" width={1774} height={887} priority />
      </span>
      <strong>{mobile ? 'AI Chat' : 'WealthBuilder'}</strong>
    </Link>
  );
}

const navigation: readonly { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/portfolio', label: 'Portfolio', icon: Wallet },
  { href: '/strategy', label: 'Strategy', icon: ShieldCheck },
  { href: '/home#quick-actions', label: 'Explore', icon: Compass },
  { href: '/home#activity', label: 'Activity', icon: Activity },
];

export function ChatSidebar() {
  return (
    <aside className="chat-sidebar">
      <ChatBrand />
      <nav aria-label="Main navigation">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link href={href} key={label}>
            <Icon />
            {label}
          </Link>
        ))}
        <Link href="/chat" className="active" aria-current="page">
          <MessageCircle />
          AI Chat
        </Link>
      </nav>
      <div className="chat-sidebar-bottom">
        <Link href="/strategy">
          <Settings />
          Settings
        </Link>
        <div>
          <span>HK</span>Hakeem
        </div>
      </div>
    </aside>
  );
}

export function ChatMobileBrand() {
  return <ChatBrand mobile />;
}

export function ChatBottomNavigation({ onMenu }: { onMenu: () => void }) {
  return (
    <nav className="chat-bottom-nav" aria-label="Mobile navigation">
      <Link href="/home">
        <Home />
        Home
      </Link>
      <Link href="/portfolio">
        <Wallet />
        Portfolio
      </Link>
      <Link href="/strategy">
        <ShieldCheck />
        Strategy
      </Link>
      <Link href="/chat" className="active" aria-current="page">
        <MessageCircle />
        AI Chat
      </Link>
      <button type="button" onClick={onMenu}>
        <MoreHorizontal />
        More
      </button>
    </nav>
  );
}
