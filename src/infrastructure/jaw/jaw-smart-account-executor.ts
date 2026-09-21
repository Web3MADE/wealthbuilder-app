import { Account, getPermissionFromRelay, type StorePermissionApiResponse } from '@jaw.id/core';
import { createPublicClient, encodeFunctionData, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { aaveV3Fuji, fujiRpcUrl } from '@/config';
import type { ExecutionPort } from '@/application/interfaces/execution';
import { atomic, usd, type ExecutionResult, type Portfolio, type ProposedAction } from '@/domain';
import { AvalancheFujiAdapter, parseFujiTokens } from '@/infrastructure/chains/avalanche-fuji-adapter';
import { ConfiguredFujiPrices } from '@/infrastructure/pricing/configured-fuji-prices';

const erc20Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;
const poolAbi = [
  { type: 'function', name: 'supply', stateMutability: 'nonpayable', inputs: [{ name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'onBehalfOf', type: 'address' }, { name: 'referralCode', type: 'uint16' }], outputs: [] },
] as const;
const dataProviderAbi = [
  { type: 'function', name: 'getUserReserveData', stateMutability: 'view', inputs: [{ name: 'asset', type: 'address' }, { name: 'user', type: 'address' }], outputs: [
    { name: 'currentATokenBalance', type: 'uint256' }, { name: 'currentStableDebt', type: 'uint256' }, { name: 'currentVariableDebt', type: 'uint256' }, { name: 'principalStableDebt', type: 'uint256' }, { name: 'scaledVariableDebt', type: 'uint256' }, { name: 'stableBorrowRate', type: 'uint256' }, { name: 'liquidityRate', type: 'uint256' }, { name: 'stableRateLastUpdated', type: 'uint40' }, { name: 'usageAsCollateralEnabled', type: 'bool' },
  ] },
] as const;

export type JawExecutionAuthority = Readonly<{
  smartAccountAddress: Address;
  permissionId: Hex;
}>;
export type JawExecutorConfig = Readonly<{
  apiKey: string;
  delegatedPrivateKey: Hex;
  rpcUrl?: string;
}>;

function failed(action: ProposedAction, failureReason: string, stages: ExecutionResult['stages']): ExecutionResult {
  return { actionId: action.id, state: 'FAILED', failureReason, stages: [...stages, 'FAILED'] };
}

function isApprovedPermission(permission: StorePermissionApiResponse, authority: JawExecutionAuthority, amount: bigint, delegateAddress: Address) {
  const usdc = aaveV3Fuji.assets.usdc!.toLowerCase();
  const calls = permission.calls.map((call) => `${call.target.toLowerCase()}:${call.selector?.toLowerCase()}`);
  const supplySelector = '0x617ba037';
  const approveSelector = '0x095ea7b3';
  const hasSupply = calls.includes(`${aaveV3Fuji.poolAddress.toLowerCase()}:${supplySelector}`);
  const hasApproval = calls.includes(`${usdc}:${approveSelector}`);
  const spend = permission.spends.find((item) => item.token.toLowerCase() === usdc);
  return permission.account.toLowerCase() === authority.smartAccountAddress.toLowerCase()
    && Number(permission.chainId) === 43113
    && permission.spender.toLowerCase() === delegateAddress.toLowerCase()
    && permission.end > Math.floor(Date.now() / 1000)
    && hasSupply && hasApproval && Boolean(spend) && BigInt(spend!.allowance) >= amount;
}

/**
 * Server-side delegated executor. It accepts only a normalized SUPPLY action
 * plus an already granted JAW permission; calldata is constructed here.
 */
export class JAWSmartAccountExecutor implements ExecutionPort {
  private readonly publicClient;
  private readonly delegatedAccount;
  private readonly usdc = aaveV3Fuji.assets.usdc!;

  constructor(private readonly config: JawExecutorConfig, private readonly authority: JawExecutionAuthority) {
    this.publicClient = createPublicClient({ chain: avalancheFuji, transport: http(config.rpcUrl ?? fujiRpcUrl) });
    this.delegatedAccount = privateKeyToAccount(config.delegatedPrivateKey);
  }

  async execute(action: ProposedAction): Promise<ExecutionResult> {
    const stages: ExecutionResult['stages'][number][] = ['PREPARING'];
    if (action.type !== 'SUPPLY' || action.chain.id !== 'avalanche-fuji' || action.protocolId !== aaveV3Fuji.id || action.asset.id !== 'usdc')
      return failed(action, 'Only USDC supply to the approved Aave V3 Fuji pool is supported.', stages);
    if (action.walletId.toLowerCase() !== this.authority.smartAccountAddress.toLowerCase())
      return failed(action, 'The action does not belong to this JAW smart account.', stages);
    try {
      const permission = await getPermissionFromRelay(this.authority.permissionId, this.config.apiKey);
      if (!isApprovedPermission(permission, this.authority, action.amount.value, this.delegatedAccount.address))
        return failed(action, 'The delegated permission is missing, expired, or outside the approved Aave USDC supply scope.', stages);
      const balance = await this.publicClient.readContract({ address: this.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [this.authority.smartAccountAddress] });
      if (balance < action.amount.value) return failed(action, 'The JAW smart account has insufficient USDC.', stages);
      const allowance = await this.publicClient.readContract({ address: this.usdc, abi: erc20Abi, functionName: 'allowance', args: [this.authority.smartAccountAddress, aaveV3Fuji.poolAddress] });
      stages.push('SIMULATING');
      if (allowance < action.amount.value) await this.publicClient.simulateContract({ account: this.authority.smartAccountAddress, address: this.usdc, abi: erc20Abi, functionName: 'approve', args: [aaveV3Fuji.poolAddress, action.amount.value] });
      const calls = [
        ...(allowance < action.amount.value ? [{ to: this.usdc, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [aaveV3Fuji.poolAddress, action.amount.value] }) }] : []),
        { to: aaveV3Fuji.poolAddress, data: encodeFunctionData({ abi: poolAbi, functionName: 'supply', args: [this.usdc, action.amount.value, this.authority.smartAccountAddress, 0] }) },
      ];
      const delegated = await Account.fromLocalAccount({ chainId: 43113, apiKey: this.config.apiKey }, this.delegatedAccount);
      const operation = await delegated.sendCalls(calls, { permissionId: this.authority.permissionId, from: this.authority.smartAccountAddress });
      stages.push('SUBMITTED');
      const completionDeadline = Date.now() + 45_000;
      while (Date.now() < completionDeadline) {
        const status = await delegated.getCallStatus(operation.id);
        if (status?.status === 200) {
          const reference = status.receipts?.[0]?.transactionHash ?? operation.id;
          return { actionId: action.id, reference, state: 'CONFIRMED', confirmedAt: new Date(), stages: [...stages, 'CONFIRMED'], portfolio: await this.portfolio() };
        }
        if (status && status.status >= 400) return failed(action, 'The delegated Aave supply was rejected or reverted.', stages);
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
      return failed(action, 'The delegated Aave supply did not confirm before the timeout.', stages);
    } catch (error) {
      console.warn('jaw_aave_execution_failed', error instanceof Error ? error.message : 'Unknown error');
      return failed(action, 'The delegated Aave supply could not be prepared or confirmed.', stages);
    }
  }

  private async portfolio(): Promise<Portfolio> {
    const walletPortfolio = await new AvalancheFujiAdapter(
      this.config.rpcUrl ?? fujiRpcUrl,
      parseFujiTokens(undefined, this.usdc),
      new ConfiguredFujiPrices(),
    ).getPortfolio(this.authority.smartAccountAddress, { id: 'avalanche-fuji' });
    const reserve = await this.publicClient.readContract({
      address: aaveV3Fuji.poolDataProviderAddress,
      abi: dataProviderAbi,
      functionName: 'getUserReserveData',
      args: [this.usdc, this.authority.smartAccountAddress],
    });
    const supplied = reserve[0];
    return {
      ...walletPortfolio,
      positions: [...walletPortfolio.positions, {
        asset: { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true },
        amount: atomic(supplied, 6),
        value: usd(supplied),
        location: 'SUPPLIED',
        protocolId: aaveV3Fuji.id,
      }],
    };
  }
}
