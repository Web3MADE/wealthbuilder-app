import { createKernelAccountClient, createZeroDevPaymasterClient } from '@zerodev/sdk';
import { createPublicClient, encodeFunctionData, http, type Address } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { aaveV3Fuji, fujiRpcUrl } from '@/config';
import type { ExecutionPort } from '@/application/interfaces/execution';
import { atomic, usd, type ExecutionResult, type Portfolio, type ProposedAction } from '@/domain';
import { AvalancheFujiAdapter, parseFujiTokens } from '@/infrastructure/chains/avalanche-fuji-adapter';
import { ConfiguredFujiPrices } from '@/infrastructure/pricing/configured-fuji-prices';
import { ZeroDevKernelSessionManager } from './zerodev-kernel-session';
import type { ZeroDevServerConfig } from './zerodev-server-config';

const erc20Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;
const poolAbi = [{ type: 'function', name: 'supply', stateMutability: 'nonpayable', inputs: [{ name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'onBehalfOf', type: 'address' }, { name: 'referralCode', type: 'uint16' }], outputs: [] }] as const;
const dataProviderAbi = [{ type: 'function', name: 'getUserReserveData', stateMutability: 'view', inputs: [{ name: 'asset', type: 'address' }, { name: 'user', type: 'address' }], outputs: [{ name: 'currentATokenBalance', type: 'uint256' }, { name: 'currentStableDebt', type: 'uint256' }, { name: 'currentVariableDebt', type: 'uint256' }, { name: 'principalStableDebt', type: 'uint256' }, { name: 'scaledVariableDebt', type: 'uint256' }, { name: 'stableBorrowRate', type: 'uint256' }, { name: 'liquidityRate', type: 'uint256' }, { name: 'stableRateLastUpdated', type: 'uint40' }, { name: 'usageAsCollateralEnabled', type: 'bool' }] }] as const;

export type ZeroDevExecutionAuthority = Readonly<{ smartAccountAddress: Address; serializedPermissionAccount: string }>;

function failed(action: ProposedAction, failureReason: string, stages: ExecutionResult['stages']): ExecutionResult {
  return { actionId: action.id, state: 'FAILED', failureReason, stages: [...stages, 'FAILED'] };
}

/** Executes a normalized USDC Aave supply through a server-held scoped Kernel permission. */
export class ZeroDevSmartAccountExecutor implements ExecutionPort {
  private readonly publicClient;
  private readonly usdc = aaveV3Fuji.assets.usdc!;

  constructor(private readonly config: ZeroDevServerConfig, private readonly authority: ZeroDevExecutionAuthority) {
    this.publicClient = createPublicClient({ chain: avalancheFuji, transport: http(fujiRpcUrl) });
  }

  async execute(action: ProposedAction): Promise<ExecutionResult> {
    const stages: ExecutionResult['stages'][number][] = ['PREPARING'];
    if (action.type !== 'SUPPLY' || action.chain.id !== 'avalanche-fuji' || action.protocolId !== aaveV3Fuji.id || action.asset.id !== 'usdc')
      return failed(action, 'Only USDC supply to the approved Aave V3 Fuji pool is supported.', stages);
    if (action.walletId.toLowerCase() !== this.authority.smartAccountAddress.toLowerCase())
      return failed(action, 'The action does not belong to this ZeroDev Kernel account.', stages);
    try {
      const balance = await this.publicClient.readContract({ address: this.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [this.authority.smartAccountAddress] });
      if (balance < action.amount.value) return failed(action, 'The ZeroDev Kernel account has insufficient USDC.', stages);
      const allowance = await this.publicClient.readContract({ address: this.usdc, abi: erc20Abi, functionName: 'allowance', args: [this.authority.smartAccountAddress, aaveV3Fuji.poolAddress] });
      stages.push('SIMULATING');
      const account = await new ZeroDevKernelSessionManager(this.config).loadSession(this.authority.serializedPermissionAccount);
      if (account.address.toLowerCase() !== this.authority.smartAccountAddress.toLowerCase()) return failed(action, 'The scoped Kernel permission does not match this account.', stages);
      const paymaster = createZeroDevPaymasterClient({ chain: avalancheFuji, transport: http(this.config.rpcUrl) });
      const client = createKernelAccountClient({ account, chain: avalancheFuji, bundlerTransport: http(this.config.rpcUrl), paymaster: { getPaymasterData: (userOperation) => paymaster.sponsorUserOperation({ userOperation }) } });
      const calls = [
        ...(allowance < action.amount.value ? [{ to: this.usdc, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [aaveV3Fuji.poolAddress, action.amount.value] }) }] : []),
        { to: aaveV3Fuji.poolAddress, data: encodeFunctionData({ abi: poolAbi, functionName: 'supply', args: [this.usdc, action.amount.value, this.authority.smartAccountAddress, 0] }) },
      ];
      const userOpHash = await client.sendUserOperation({ callData: await account.encodeCalls(calls) });
      stages.push('SUBMITTED');
      const receipt = await client.waitForUserOperationReceipt({ hash: userOpHash });
      return { actionId: action.id, reference: receipt.receipt.transactionHash ?? userOpHash, state: 'CONFIRMED', confirmedAt: new Date(), stages: [...stages, 'CONFIRMED'], portfolio: await this.portfolio() };
    } catch (error) {
      console.warn('zerodev_aave_execution_failed', error instanceof Error ? error.message : 'Unknown error');
      return failed(action, 'The scoped ZeroDev Aave supply could not be prepared or confirmed.', stages);
    }
  }

  private async portfolio(): Promise<Portfolio> {
    const wallet = await new AvalancheFujiAdapter(fujiRpcUrl, parseFujiTokens(undefined, this.usdc), new ConfiguredFujiPrices()).getPortfolio(this.authority.smartAccountAddress, { id: 'avalanche-fuji' });
    const reserve = await this.publicClient.readContract({ address: aaveV3Fuji.poolDataProviderAddress, abi: dataProviderAbi, functionName: 'getUserReserveData', args: [this.usdc, this.authority.smartAccountAddress] });
    return { ...wallet, positions: [...wallet.positions, { asset: { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true }, amount: atomic(reserve[0], 6), value: usd(reserve[0]), location: 'SUPPLIED', protocolId: aaveV3Fuji.id }] };
  }
}
