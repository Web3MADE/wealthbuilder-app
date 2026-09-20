import { NextResponse } from 'next/server';
import { z } from 'zod';
import { walletAuthService } from '@/bootstrap';
import { newNonce, nonceCookieName } from '@/infrastructure/auth/session';

const requestSchema = z.object({ address: z.string() });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Wallet address required.' }, { status: 400 });
  const origin = new URL(request.url).origin;
  const nonce = newNonce();
  try {
    const message = walletAuthService().challenge(
      parsed.data.address,
      nonce,
      new URL(origin).host,
      origin,
    );
    const response = NextResponse.json({ message });
    response.cookies.set(nonceCookieName, nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 300,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Invalid wallet address or server configuration.' },
      { status: 400 },
    );
  }
}
