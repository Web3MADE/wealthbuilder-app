import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { deserializePermissionAccount, serializePermissionAccount, toPermissionValidator } from '@zerodev/permissions';
import { CallPolicyVersion, ParamCondition, toCallPolicy, toTimestampPolicy } from '@zerodev/permissions/policies';
import { toECDSASigner } from '@zerodev/permissions/signers';
import { createKernelAccount } from '@zerodev/sdk';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { createPublicClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { aaveV3Fuji } from '@/config';
import type { ZeroDevServerConfig } from './zerodev-server-config';

const entryPoint = getEntryPoint('0.7');
const erc20Abi = [{ type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }] as const;
const poolAbi = [{ type: 'function', name: 'supply', stateMutability: 'nonpayable', inputs: [{ name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'onBehalfOf', type: 'address' }, { name: 'referralCode', type: 'uint16' }], outputs: [] }] as const;

export type ZeroDevSession = Readonly<{
  smartAccountAddress: Address;
  agentAddress: Address;
  serializedPermissionAccount: string;
  expiresAt: string;
}>;

/** Official Kernel v3 owner/session-key composition. All private keys remain server-side. */
export class ZeroDevKernelSessionManager {
  private readonly publicClient;
  private readonly owner;
  private readonly agent;

  constructor(private readonly config: ZeroDevServerConfig) {
    this.publicClient = createPublicClient({ chain: avalancheFuji, transport: http(config.rpcUrl) });
    this.owner = privateKeyToAccount(config.ownerPrivateKey);
    this.agent = privateKeyToAccount(config.agentPrivateKey);
  }

  async smartAccountAddress(): Promise<Address> {
    return (await this.ownerAccount()).address;
  }

  async createSession(amount: bigint, durationSeconds = 30 * 60): Promise<ZeroDevSession> {
    const ownerAccount = await this.ownerAccount();
    const expiresAt = Math.floor(Date.now() / 1000) + durationSeconds;
    const permissionSigner = await toECDSASigner({ signer: this.agent });
    const permissionPlugin = await toPermissionValidator(this.publicClient, {
      entryPoint,
      signer: permissionSigner,
      kernelVersion: KERNEL_V3_1,
      policies: [
        toTimestampPolicy({ validUntil: expiresAt }),
        toCallPolicy({
          policyVersion: CallPolicyVersion.V0_0_4,
          permissions: [
            {
              target: aaveV3Fuji.assets.usdc!, abi: erc20Abi, functionName: 'approve',
              args: [
                { condition: ParamCondition.EQUAL, value: aaveV3Fuji.poolAddress },
                { condition: ParamCondition.LESS_THAN_OR_EQUAL, value: amount },
              ],
            },
            {
              target: aaveV3Fuji.poolAddress, abi: poolAbi, functionName: 'supply',
              args: [
                { condition: ParamCondition.EQUAL, value: aaveV3Fuji.assets.usdc! },
                { condition: ParamCondition.LESS_THAN_OR_EQUAL, value: amount },
                { condition: ParamCondition.EQUAL, value: ownerAccount.address },
                { condition: ParamCondition.EQUAL, value: 0 },
              ],
            },
          ] as const,
        }),
      ],
    });
    const permissionAccount = await createKernelAccount(this.publicClient, {
      entryPoint,
      kernelVersion: KERNEL_V3_1,
      plugins: { sudo: await this.sudoValidator(), regular: permissionPlugin },
    });
    if (permissionAccount.address.toLowerCase() !== ownerAccount.address.toLowerCase())
      throw new Error('ZeroDev permission account did not resolve to the owner Kernel account.');
    return {
      smartAccountAddress: ownerAccount.address,
      agentAddress: this.agent.address,
      serializedPermissionAccount: await serializePermissionAccount(permissionAccount, this.config.agentPrivateKey),
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  }

  async loadSession(serializedPermissionAccount: string) {
    return deserializePermissionAccount(this.publicClient, entryPoint, KERNEL_V3_1, serializedPermissionAccount);
  }

  private async sudoValidator() {
    return signerToEcdsaValidator(this.publicClient, { signer: this.owner, entryPoint, kernelVersion: KERNEL_V3_1 });
  }

  private async ownerAccount() {
    return createKernelAccount(this.publicClient, { entryPoint, kernelVersion: KERNEL_V3_1, plugins: { sudo: await this.sudoValidator() } });
  }
}
