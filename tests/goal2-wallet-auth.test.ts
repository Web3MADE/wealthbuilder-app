import { describe, expect, it } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { createSiweMessage } from 'viem/siwe';
import { SiweVerifier } from '../src/infrastructure/auth/siwe';
import { createSession, readSession } from '../src/infrastructure/auth/session';

const account = privateKeyToAccount(
  '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
);
const verifier = new SiweVerifier();
const secret = 'goal-2-test-session-secret-at-least-thirty-two-characters';

describe('wallet authentication', () => {
  it('accepts a signed Fuji SIWE challenge for its nonce and domain', async () => {
    const message = verifier.challenge(
      account.address,
      '1234567890abcdef',
      'localhost:3000',
      'http://localhost:3000',
    );
    const signature = await account.signMessage({ message });
    expect(
      await verifier.verify({
        message,
        signature,
        nonce: '1234567890abcdef',
        domain: 'localhost:3000',
      }),
    ).toBe(account.address.toLowerCase());
    expect(
      await verifier.verify({
        message,
        signature,
        nonce: 'wrongnonce123456',
        domain: 'localhost:3000',
      }),
    ).toBeNull();
    expect(
      await verifier.verify({
        message,
        signature,
        nonce: '1234567890abcdef',
        domain: 'evil.example',
      }),
    ).toBeNull();
  });

  it('rejects a changed signature and an expired challenge', async () => {
    const message = verifier.challenge(
      account.address,
      '1234567890abcdef',
      'localhost:3000',
      'http://localhost:3000',
    );
    const other = privateKeyToAccount(
      '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    );
    const signature = await other.signMessage({ message });
    expect(
      await verifier.verify({
        message,
        signature,
        nonce: '1234567890abcdef',
        domain: 'localhost:3000',
      }),
    ).toBeNull();
    const expired = createSiweMessage({
      address: account.address,
      chainId: 43113,
      domain: 'localhost:3000',
      nonce: '1234567890abcdef',
      uri: 'http://localhost:3000',
      version: '1',
      issuedAt: new Date(Date.now() - 120_000),
      expirationTime: new Date(Date.now() - 60_000),
    });
    const expiredSignature = await account.signMessage({ message: expired });
    expect(
      await verifier.verify({
        message: expired,
        signature: expiredSignature,
        nonce: '1234567890abcdef',
        domain: 'localhost:3000',
      }),
    ).toBeNull();
  });

  it('accepts only untampered, unexpired session cookies', () => {
    const cookie = createSession(account.address.toLowerCase(), secret);
    expect(readSession(cookie, secret)).toBe(account.address.toLowerCase());
    expect(readSession(cookie + 'x', secret)).toBeNull();
    expect(readSession(cookie, 'different-secret')).toBeNull();
  });
});
