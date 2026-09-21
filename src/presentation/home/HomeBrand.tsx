import Image from 'next/image';
import Link from 'next/link';

export function HomeBrand() {
  return (
    <Link href="/home" className="home-brand" aria-label="WealthBuilder home">
      <span className="home-brand-mark">
        <Image src="/assets/WealthBuilder_logo.png" alt="" width={1774} height={887} priority />
      </span>
      <span>WealthBuilder</span>
    </Link>
  );
}
