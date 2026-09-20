import { NextResponse } from 'next/server';
import { sessionCookieName } from '@/infrastructure/auth/session';

export async function POST() {
  const response = NextResponse.json({ wallet: null });
  response.cookies.delete(sessionCookieName);
  return response;
}
