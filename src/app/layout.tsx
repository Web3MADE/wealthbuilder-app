import type { Metadata, Viewport } from 'next';
import './globals.css';
import { WalletProviders } from '@/bootstrap-client';

export const metadata: Metadata = {
  title: 'WealthBuilder',
  description: 'Your policy-controlled personal crypto bank.',
  applicationName: 'WealthBuilder',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { themeColor: '#07140f' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WalletProviders>{children}</WalletProviders>
      </body>
    </html>
  );
}
