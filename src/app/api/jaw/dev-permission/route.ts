import { NextResponse } from 'next/server';
import { z } from 'zod';
import { JawHeadlessRoot } from '@/infrastructure/jaw/jaw-headless-root';
import { jawHeadlessConfig } from '@/infrastructure/jaw/jaw-server-config';

export const runtime = 'nodejs';
const requestSchema = z.object({ amountUsdc: z.string().regex(/^\d+(?:\.\d{1,6})?$/) }).strict();

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A valid USDC amount is required.' }, { status: 400 });
  const config = jawHeadlessConfig();
  if (!config) return NextResponse.json({ error: 'Headless JAW development is unavailable.' }, { status: 404 });
  try {
    return NextResponse.json(await new JawHeadlessRoot(config).grantAaveUsdcSupplyPermission(parsed.data.amountUsdc));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not grant the JAW delegated permission.' }, { status: 502 });
  }
}
