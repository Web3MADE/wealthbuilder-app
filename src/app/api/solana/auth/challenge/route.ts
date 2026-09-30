import { NextResponse } from 'next/server';
import { z } from 'zod';
import { address } from '@solana/kit';
import {
  newSolanaPolicyNonce,
  solanaPolicyChallenge,
  solanaPolicyNonceCookieName,
} from '@/infrastructure/solana/solana-policy-session';

const requestSchema = z.object({ address: z.string().min(32).max(44) });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Solana wallet address required.' }, { status: 400 });
  try {
    address(parsed.data.address);
    const nonce = newSolanaPolicyNonce();
    const response = NextResponse.json({
      message: solanaPolicyChallenge(parsed.data.address, nonce, new URL(request.url).host),
    });
    response.cookies.set(solanaPolicyNonceCookieName, nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 300,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid Solana wallet address.' }, { status: 400 });
  }
}
