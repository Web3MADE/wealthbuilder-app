export interface WalletSignaturePort {
  challenge(address: string, nonce: string, domain: string, origin: string): string;
  verify(
    input: Readonly<{ message: string; signature: `0x${string}`; nonce: string; domain: string }>,
  ): Promise<string | null>;
}

export interface UserIdentityPort {
  ensure(walletAddress: string): Promise<void>;
}
