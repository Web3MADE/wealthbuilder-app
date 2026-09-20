import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { walletAuthService } from '@/bootstrap';
import {
  createSession,
  nonceCookieName,
  sessionCookieName,
  sessionCookieOptions,
} from '@/infrastructure/auth/session';

const requestSchema = z.object({
  message: z.string(),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  const nonce = request.cookies.get(nonceCookieName)?.value;
  if (!parsed.success || !nonce)
    return NextResponse.json({ error: 'Authentication challenge expired.' }, { status: 401 });
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    return NextResponse.json({ error: 'Session signing is not configured.' }, { status: 503 });
  const wallet = await walletAuthService().authenticate({
    ...parsed.data,
    signature: parsed.data.signature as `0x${string}`,
    nonce,
    domain: request.nextUrl.host,
  });
  if (!wallet)
    return NextResponse.json({ error: 'Signature verification failed.' }, { status: 401 });
  const response = NextResponse.json({ wallet });
  response.cookies.set(sessionCookieName, createSession(wallet, secret), sessionCookieOptions);
  response.cookies.delete(nonceCookieName);
  return response;
}
