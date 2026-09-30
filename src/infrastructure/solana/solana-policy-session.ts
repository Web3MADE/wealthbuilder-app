import { createHmac, randomBytes, timingSafeEqual, verify } from 'node:crypto';
import { address, getAddressEncoder } from '@solana/kit';

export const solanaPolicySessionCookieName = 'wealthbuilder_solana_policy_session';
export const solanaPolicyNonceCookieName = 'wealthbuilder_solana_policy_nonce';
const sessionSeconds = 7 * 24 * 60 * 60;

export function newSolanaPolicyNonce(): string {
  return randomBytes(16).toString('hex');
}

export function solanaPolicyChallenge(wallet: string, nonce: string, domain: string): string {
  return `WealthBuilder Solana policy sign-in\nDomain: ${domain}\nWallet: ${wallet}\nNonce: ${nonce}`;
}

export function verifySolanaPolicySignature(
  wallet: string,
  message: string,
  signature: Uint8Array,
): boolean {
  try {
    const publicKey = getAddressEncoder().encode(address(wallet));
    const subjectPublicKeyInfo = Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      Buffer.from(publicKey),
    ]);
    return verify(
      null,
      Buffer.from(message),
      { key: subjectPublicKeyInfo, format: 'der', type: 'spki' },
      signature,
    );
  } catch {
    return false;
  }
}

export function createSolanaPolicySession(wallet: string, secret: string): string {
  const body = Buffer.from(
    JSON.stringify({ wallet, expires: Date.now() + sessionSeconds * 1000 }),
  ).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function readSolanaPolicySession(cookie: string | undefined, secret: string): string | null {
  if (!cookie) return null;
  const [body, signature] = cookie.split('.');
  if (!body || !signature) return null;
  const expected = createHmac('sha256', secret).update(body).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!value || typeof value !== 'object') return null;
    const { wallet, expires } = value as Record<string, unknown>;
    if (typeof wallet !== 'string' || typeof expires !== 'number' || expires <= Date.now())
      return null;
    address(wallet);
    return wallet;
  } catch {
    return null;
  }
}

export const solanaPolicySessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: sessionSeconds,
};
