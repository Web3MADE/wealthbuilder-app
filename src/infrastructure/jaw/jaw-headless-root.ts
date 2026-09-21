import { Account } from '@jaw.id/core';
import { privateKeyToAccount } from 'viem/accounts';
import { parseUnits, type Address } from 'viem';
import { aaveUsdcSupplyPermissions } from './jaw-aave-permission';
import type { JawHeadlessConfig } from './jaw-server-config';

export type HeadlessJawPermission = Readonly<{
  smartAccountAddress: Address;
  permissionId: `0x${string}`;
  expiresAt: string;
}>;

/** Official JAW headless account path for localhost development only. */
export class JawHeadlessRoot {
  constructor(private readonly config: JawHeadlessConfig) {}

  async smartAccountAddress(): Promise<Address> {
    return (await this.root()).getAddress();
  }

  async grantAaveUsdcSupplyPermission(amountUsdc: string, expirySeconds = 60 * 30): Promise<HeadlessJawPermission> {
    const amount = parseUnits(amountUsdc, 6);
    if (amount <= 0n) throw new Error('A positive USDC amount is required.');
    const root = await this.root();
    const response = await root.grantPermissions(
      Math.floor(Date.now() / 1000) + expirySeconds,
      privateKeyToAccount(this.config.delegatedPrivateKey).address,
      aaveUsdcSupplyPermissions(amount),
    );
    return {
      smartAccountAddress: response.account,
      permissionId: response.permissionId,
      expiresAt: new Date(response.end * 1000).toISOString(),
    };
  }

  private async root() {
    return Account.fromLocalAccount(
      { chainId: 43113, apiKey: this.config.apiKey },
      privateKeyToAccount(this.config.devPrivateKey),
    );
  }
}
