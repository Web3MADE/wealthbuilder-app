import { Account, type PermissionsDetail, type WalletGrantPermissionsResponse } from '@jaw.id/core';
import { type Address, type Hex, parseUnits } from 'viem';
import { aaveV3Fuji } from '@/config';

const fujiChainId = 43113;
const supplySignature = 'supply(address,uint256,address,uint16)';
const approveSignature = 'approve(address,uint256)';

export type JawPermissionState = Readonly<{
  smartAccountAddress: Address;
  permissionId: Hex;
  expiresAt: string;
}>;

async function browserConfig() {
  const configuredApiKey = process.env.NEXT_PUBLIC_JAW_API_KEY;
  const configuredDelegate = process.env.NEXT_PUBLIC_JAW_DELEGATE_ADDRESS as Address | undefined;
  if (configuredApiKey && configuredDelegate) return { apiKey: configuredApiKey, delegateAddress: configuredDelegate };
  const response = await fetch('/api/jaw/config');
  const payload = await response.json() as { apiKey?: string; delegateAddress?: Address; error?: string };
  if (!response.ok || !payload.apiKey || !payload.delegateAddress)
    throw new Error(payload.error ?? 'JAW is not configured.');
  return { apiKey: payload.apiKey, delegateAddress: payload.delegateAddress };
}

export function aaveUsdcSupplyPermissions(amount: bigint): PermissionsDetail {
  const usdc = aaveV3Fuji.assets.usdc!;
  return {
    calls: [
      { target: aaveV3Fuji.poolAddress, functionSignature: supplySignature },
      // Aave requires a USDC approval before supply. This remains constrained to
      // the approved asset and the Aave pool; the spend cap below bounds its use.
      { target: usdc, functionSignature: approveSignature },
    ],
    spends: [{ token: usdc, allowance: amount.toString(), unit: 'day', multiplier: 1 }],
  };
}

/** Browser-side root-authority flow. The passkey signs only permission grants. */
export class JawAavePermissionClient {
  private account: Account | null = null;

  async createOrLoad(): Promise<Address> {
    const { apiKey } = await browserConfig();
    const config = { chainId: fujiChainId, apiKey };
    const existing = Account.getAuthenticatedAddress(apiKey);
    this.account = existing
      ? await Account.get(config)
      : await Account.create(config, { username: 'WealthBuilder' });
    return this.account.getAddress();
  }

  async grantAaveUsdcSupplyPermission(amountUsdc: string, expirySeconds = 60 * 30): Promise<JawPermissionState> {
    const { delegateAddress } = await browserConfig();
    const smartAccountAddress = await this.createOrLoad();
    const amount = parseUnits(amountUsdc, 6);
    if (amount <= 0n) throw new Error('A positive USDC amount is required.');
    const response: WalletGrantPermissionsResponse = await this.account!.grantPermissions(
      Math.floor(Date.now() / 1000) + expirySeconds,
      delegateAddress,
      aaveUsdcSupplyPermissions(amount),
    );
    return {
      smartAccountAddress,
      permissionId: response.permissionId,
      expiresAt: new Date(response.end * 1000).toISOString(),
    };
  }
}
