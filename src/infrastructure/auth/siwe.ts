import { isAddress, verifyMessage } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { createSiweMessage, parseSiweMessage, validateSiweMessage } from 'viem/siwe';
import type { WalletSignaturePort } from '@/application/interfaces/auth';

export class SiweVerifier implements WalletSignaturePort {
  challenge(address: string, nonce: string, domain: string, origin: string): string {
    if (!isAddress(address)) throw new Error('Invalid wallet address.');
    return createSiweMessage({
      address,
      chainId: avalancheFuji.id,
      domain,
      nonce,
      uri: origin,
      version: '1',
      issuedAt: new Date(),
      expirationTime: new Date(Date.now() + 5 * 60_000),
      statement: 'Sign in to WealthBuilder.',
    });
  }

  async verify(
    input: Readonly<{ message: string; signature: `0x${string}`; nonce: string; domain: string }>,
  ): Promise<string | null> {
    try {
      const parsed = parseSiweMessage(input.message);
      if (!parsed.address || !isAddress(parsed.address) || parsed.chainId !== avalancheFuji.id)
        return null;
      if (
        !validateSiweMessage({
          message: parsed,
          address: parsed.address,
          nonce: input.nonce,
          domain: input.domain,
        })
      )
        return null;
      const valid = await verifyMessage({
        address: parsed.address,
        message: input.message,
        signature: input.signature,
      });
      return valid ? parsed.address.toLowerCase() : null;
    } catch {
      return null;
    }
  }
}
