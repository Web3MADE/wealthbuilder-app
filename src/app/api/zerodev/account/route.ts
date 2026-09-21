import { NextResponse } from 'next/server';
import { ZeroDevKernelSessionManager } from '@/infrastructure/zerodev/zerodev-kernel-session';
import { zeroDevServerConfig } from '@/infrastructure/zerodev/zerodev-server-config';

export const runtime = 'nodejs';

export async function GET() {
  const config = zeroDevServerConfig();
  if (!config)
    return NextResponse.json(
      { error: 'ZeroDev development configuration is unavailable.' },
      { status: 404 },
    );
  return NextResponse.json({
    smartAccountAddress: await new ZeroDevKernelSessionManager(config).smartAccountAddress(),
  });
}
