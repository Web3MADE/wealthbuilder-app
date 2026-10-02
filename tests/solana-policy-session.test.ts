import { generateKeyPairSync, sign } from 'node:crypto';
import { getAddressDecoder } from '@solana/kit';
import { describe, expect, it } from 'vitest';
import {
  createSolanaPolicySession,
  readSolanaPolicySession,
  solanaPolicyChallenge,
  verifySolanaPolicySignature,
} from '../src/infrastructure/solana/solana-policy-session';

function signingWallet() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const publicKeyDer = publicKey.export({ format: 'der', type: 'spki' });
  const wallet = getAddressDecoder().decode(new Uint8Array(publicKeyDer.subarray(-32)));
  return { privateKey, wallet };
}

describe('Solana policy wallet session', () => {
  it('verifies a signed policy challenge against the connected public key', () => {
    const { privateKey, wallet } = signingWallet();
    const message = solanaPolicyChallenge(wallet, 'nonce', 'wealthbuilder.test');
    const signature = sign(null, Buffer.from(message), privateKey);

    expect(verifySolanaPolicySignature(wallet, message, signature)).toBe(true);
    expect(verifySolanaPolicySignature(wallet, `${message}!`, signature)).toBe(false);
  });

  it('keeps the case-sensitive Solana wallet address in a signed session', () => {
    const { wallet } = signingWallet();
    const session = createSolanaPolicySession(wallet, 'a'.repeat(32));

    expect(readSolanaPolicySession(session, 'a'.repeat(32))).toBe(wallet);
    expect(readSolanaPolicySession(`${session}x`, 'a'.repeat(32))).toBeNull();
  });
});
