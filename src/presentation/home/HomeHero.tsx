import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export function HomeHero({ name }: { name: string }) {
  return (
    <section className="home-hero">
      <p>Good morning, {name}</p>
      <h1>
        Your wealth
        <br />
        <span>is working for you.</span>
      </h1>
      <p>Long-term growth. On-chain. On your terms.</p>
      <div className="home-hero-actions">
        <Link href="/chat">
          Ask WealthBuilder <ArrowRight size={18} />
        </Link>
        <Link href="/strategy">View strategy</Link>
      </div>
      <span className="home-goal-float">
        <CheckCircle2 size={20} />
        <span>
          <strong>Long-term wealth</strong>
          <small>Built different.</small>
        </span>
      </span>
    </section>
  );
}
