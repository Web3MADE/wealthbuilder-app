import Link from 'next/link';
import { ArrowRight, MessageCircle, Settings, WalletCards } from 'lucide-react';

const actions = [
  {
    href: '/chat',
    icon: MessageCircle,
    label: (
      <>
        Chat with
        <br />
        WealthBuilder
      </>
    ),
  },
  { href: '/portfolio', icon: WalletCards, label: <>View portfolio</> },
  { href: '/strategy', icon: Settings, label: <>Edit policy</> },
];

export function HomeQuickActions() {
  return (
    <section className="home-quick" id="quick-actions">
      <h2>Quick actions</h2>
      <div>
        {actions.map(({ href, icon: Icon, label }) => (
          <Link href={href} key={href}>
            <Icon size={22} />
            <span>{label}</span>
            <ArrowRight size={17} />
          </Link>
        ))}
      </div>
    </section>
  );
}
