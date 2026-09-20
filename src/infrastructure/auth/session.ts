import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const sessionCookieName = 'wealthbuilder_session';
export const nonceCookieName = 'wealthbuilder_nonce';
const sessionSeconds = 7 * 24 * 60 * 60;

export function newNonce(): string {
  return randomBytes(16).toString('hex');
}

export function createSession(wallet: string, secret: string): string {
  const body = Buffer.from(
    JSON.stringify({ wallet, expires: Date.now() + sessionSeconds * 1000 }),
  ).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function readSession(cookie: string | undefined, secret: string): string | null {
  if (!cookie) return null;
  const [body, signature] = cookie.split('.');
  if (!body || !signature) return null;
  const expected = createHmac('sha256', secret).update(body).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!value || typeof value !== 'object') return null;
    const { wallet, expires } = value as Record<string, unknown>;
    if (
      typeof wallet !== 'string' ||
      !/^0x[a-f0-9]{40}$/.test(wallet) ||
      typeof expires !== 'number' ||
      expires <= Date.now()
    )
      return null;
    return wallet;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: sessionSeconds,
};
