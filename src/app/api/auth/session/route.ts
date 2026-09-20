import { NextRequest, NextResponse } from 'next/server';
import { readSession, sessionCookieName } from '@/infrastructure/auth/session';

export async function GET(request: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  const wallet = secret ? readSession(request.cookies.get(sessionCookieName)?.value, secret) : null;
  return NextResponse.json({ wallet });
}
