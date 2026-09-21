import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseUnits } from 'viem';
import { ZeroDevKernelSessionManager } from '@/infrastructure/zerodev/zerodev-kernel-session';
import { zeroDevServerConfig } from '@/infrastructure/zerodev/zerodev-server-config';

export const runtime = 'nodejs';
const bodySchema = z.object({ amountUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/) }).strict();

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'A valid USDC amount is required.' }, { status: 400 });
  const config = zeroDevServerConfig();
  if (!config)
    return NextResponse.json(
      { error: 'ZeroDev development configuration is unavailable.' },
      { status: 404 },
    );
  try {
    const session = await new ZeroDevKernelSessionManager(config).createSession(
      parseUnits(parsed.data.amountUsdc, 6),
    );
    return NextResponse.json({
      smartAccountAddress: session.smartAccountAddress,
      permissionId: 'zerodev-session',
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not create the scoped ZeroDev permission.',
      },
      { status: 502 },
    );
  }
}
