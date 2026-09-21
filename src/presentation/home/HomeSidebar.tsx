import Link from 'next/link';
import {
  Activity,
  Compass,
  Home,
  MessageCircle,
  PieChart,
  Settings,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { existingUser } from '@/presentation/dev/seeded-users';
import { HomeBrand } from './HomeBrand';

const navigation: readonly { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Portfolio', href: '/portfolio', icon: WalletCards },
  { label: 'Strategy', href: '/strategy', icon: ShieldCheck },
  { label: 'Explore', href: '#quick-actions', icon: Compass },
  { label: 'Activity', href: '#activity', icon: Activity },
];

export function HomeSidebar() {
  return (
    <aside className="home-sidebar">
      <HomeBrand />
      <nav aria-label="Main navigation">
        {navigation.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className={label === 'Home' ? 'active' : ''}
            aria-current={label === 'Home' ? 'page' : undefined}
          >
            <Icon />
            {label}
          </Link>
        ))}
        <div className="home-nav-divider" />
        <Link href="/chat">
          <MessageCircle />
          AI Chat
        </Link>
      </nav>
      <div className="home-sidebar-bottom">
        <a href="#account">
          <Settings />
          Settings
        </a>
        <div id="account">
          <span>HK</span>
          <strong>{existingUser.name.split(' ')[0]}</strong>
          <span aria-hidden="true">›</span>
        </div>
      </div>
    </aside>
  );
}
