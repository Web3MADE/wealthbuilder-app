import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createSolanaPolicySession,
  readSolanaPolicySession,
  solanaPolicyChallenge,
  solanaPolicyNonceCookieName,
  solanaPolicySessionCookieName,
  solanaPolicySessionCookieOptions,
  verifySolanaPolicySignature,
} from '@/infrastructure/solana/solana-policy-session';

const requestSchema = z.object({
  address: z.string().min(32).max(44),
  signature: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  const nonce = request.cookies.get(solanaPolicyNonceCookieName)?.value;
  const secret = process.env.SESSION_SECRET;
  if (!parsed.success || !nonce)
    return NextResponse.json({ error: 'Policy sign-in expired.' }, { status: 401 });
  if (!secret || secret.length < 32)
    return NextResponse.json({ error: 'Session signing is not configured.' }, { status: 503 });
  const message = solanaPolicyChallenge(parsed.data.address, nonce, request.nextUrl.host);
  const signature = Buffer.from(parsed.data.signature, 'base64');
  if (
    signature.length !== 64 ||
    !verifySolanaPolicySignature(parsed.data.address, message, signature)
  )
    return NextResponse.json({ error: 'Signature verification failed.' }, { status: 401 });
  const response = NextResponse.json({ wallet: parsed.data.address });
  response.cookies.set(
    solanaPolicySessionCookieName,
    createSolanaPolicySession(parsed.data.address, secret),
    solanaPolicySessionCookieOptions,
  );
  response.cookies.delete(solanaPolicyNonceCookieName);
  return response;
}
