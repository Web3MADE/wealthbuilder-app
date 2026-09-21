import { NextResponse } from 'next/server';
import { devActivityStore } from '@/infrastructure/dev/dev-activity-store';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ items: devActivityStore().list() });
}
