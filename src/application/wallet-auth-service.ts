import type { UserIdentityPort, WalletSignaturePort } from './interfaces/auth';

export class WalletAuthService {
  constructor(
    private readonly signatures: WalletSignaturePort,
    private readonly users: UserIdentityPort,
  ) {}

  challenge(address: string, nonce: string, domain: string, origin: string): string {
    return this.signatures.challenge(address, nonce, domain, origin);
  }

  async authenticate(
    input: Readonly<{ message: string; signature: `0x${string}`; nonce: string; domain: string }>,
  ): Promise<string | null> {
    const wallet = await this.signatures.verify(input);
    if (!wallet) return null;
    await this.users.ensure(wallet);
    return wallet;
  }
}
