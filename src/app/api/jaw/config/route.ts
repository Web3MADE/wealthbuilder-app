import { NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';
import { jawServerConfig } from '@/infrastructure/jaw/jaw-server-config';

export const runtime = 'nodejs';

/** Returns only browser-safe JAW setup details; the delegate private key stays server-side. */
export function GET() {
  const config = jawServerConfig();
  if (!config) return NextResponse.json({ error: 'JAW is not configured.' }, { status: 503 });
  return NextResponse.json({
    apiKey: config.apiKey,
    delegateAddress: privateKeyToAccount(config.delegatedPrivateKey).address,
    chainId: 43113,
  });
}
