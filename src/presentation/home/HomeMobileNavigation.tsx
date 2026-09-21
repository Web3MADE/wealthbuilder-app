import Link from 'next/link';
import { Home, PieChart, ShieldCheck } from 'lucide-react';

export function HomeMobileNavigation() {
  return (
    <nav className="home-bottom-nav" aria-label="Mobile navigation">
      <Link className="active" href="/home" aria-current="page">
        <Home size={25} />
        Home
      </Link>
      <Link href="/portfolio">
        <PieChart size={25} />
        Portfolio
      </Link>
      <Link href="/strategy">
        <ShieldCheck size={25} />
        Policy
      </Link>
    </nav>
  );
}
