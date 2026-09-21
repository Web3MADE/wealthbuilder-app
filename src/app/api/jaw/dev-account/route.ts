import { NextResponse } from 'next/server';
import { JawHeadlessRoot } from '@/infrastructure/jaw/jaw-headless-root';
import { jawHeadlessConfig } from '@/infrastructure/jaw/jaw-server-config';

export const runtime = 'nodejs';

export async function GET() {
  const config = jawHeadlessConfig();
  if (!config)
    return NextResponse.json(
      { error: 'Headless JAW development is unavailable.' },
      { status: 404 },
    );
  try {
    return NextResponse.json({
      smartAccountAddress: await new JawHeadlessRoot(config).smartAccountAddress(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not create the JAW development smart account.' },
      { status: 502 },
    );
  }
}
