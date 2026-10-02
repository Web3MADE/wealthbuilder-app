import { WalletProviders } from '@/bootstrap-client';

export default function SolanaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <WalletProviders>{children}</WalletProviders>;
}
