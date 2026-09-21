import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { aaveV3Fuji } from '@/config';
import { atomic, usd, type ExecutionResult, type Portfolio, type ProposedAction } from '@/domain';
import type { ExecutionPort } from '@/application/interfaces/execution';
import {
  AvalancheFujiAdapter,
  parseFujiTokens,
} from '@/infrastructure/chains/avalanche-fuji-adapter';
import { ConfiguredFujiPrices } from '@/infrastructure/pricing/configured-fuji-prices';

const localMnemonic = 'test test test test test test test test test test test junk';
const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;
const poolAbi = [
  {
    type: 'function',
    name: 'supply',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' },
    ],
    outputs: [],
  },
] as const;
const dataProviderAbi = [
  {
    type: 'function',
    name: 'getUserReserveData',
    stateMutability: 'view',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'currentATokenBalance', type: 'uint256' },
      { name: 'currentStableDebt', type: 'uint256' },
      { name: 'currentVariableDebt', type: 'uint256' },
      { name: 'principalStableDebt', type: 'uint256' },
      { name: 'scaledVariableDebt', type: 'uint256' },
      { name: 'stableBorrowRate', type: 'uint256' },
      { name: 'liquidityRate', type: 'uint256' },
      { name: 'stableRateLastUpdated', type: 'uint40' },
      { name: 'usageAsCollateralEnabled', type: 'bool' },
    ],
  },
] as const;

export const localDevAccount = mnemonicToAccount(localMnemonic);

function isLocalFork(rpcUrl: string) {
  const hostname = new URL(rpcUrl).hostname;
  return hostname === '127.0.0.1' || hostname === 'localhost';
}

function failed(
  action: ProposedAction,
  failureReason: string,
  stages: ExecutionResult['stages'],
): ExecutionResult {
  return { actionId: action.id, state: 'FAILED', failureReason, stages: [...stages, 'FAILED'] };
}

export class LocalDevAaveExecutor implements ExecutionPort {
  private readonly publicClient;
  private readonly walletClient;
  private readonly usdcAddress = aaveV3Fuji.assets.usdc!;

  constructor(private readonly rpcUrl: string) {
    if (!isLocalFork(rpcUrl))
      throw new Error('Local development execution requires a localhost Fuji fork.');
    this.publicClient = createPublicClient({ chain: avalancheFuji, transport: http(rpcUrl) });
    this.walletClient = createWalletClient({
      chain: avalancheFuji,
      account: localDevAccount,
      transport: http(rpcUrl),
    });
  }

  async execute(action: ProposedAction): Promise<ExecutionResult> {
    const stages: ('PREPARING' | 'SIMULATING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED')[] = [
      'PREPARING',
    ];
    if (
      action.type !== 'SUPPLY' ||
      action.chain.id !== 'avalanche-fuji' ||
      action.protocolId !== aaveV3Fuji.id ||
      action.asset.id !== 'usdc'
    )
      return failed(action, 'Only USDC supply to Aave V3 on Fuji is supported.', stages);
    if (action.walletId.toLowerCase() !== localDevAccount.address.toLowerCase())
      return failed(action, 'The action is not assigned to the local development account.', stages);
    try {
      const balance = await this.publicClient.readContract({
        address: this.usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [localDevAccount.address],
      });
      if (balance < action.amount.value)
        return failed(action, 'The local development account has insufficient USDC.', stages);
      const allowance = await this.publicClient.readContract({
        address: this.usdcAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [localDevAccount.address, aaveV3Fuji.poolAddress],
      });
      stages.push('SIMULATING');
      let approvalReference: `0x${string}` | undefined;
      if (allowance < action.amount.value) {
        const approval = await this.publicClient.simulateContract({
          account: localDevAccount,
          address: this.usdcAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [aaveV3Fuji.poolAddress, action.amount.value],
        });
        approvalReference = await this.walletClient.writeContract(approval.request);
        const approvalReceipt = await this.publicClient.waitForTransactionReceipt({
          hash: approvalReference,
          timeout: 20_000,
        });
        if (approvalReceipt.status !== 'success')
          return failed(action, 'The USDC approval transaction reverted.', stages);
      }
      const supply = await this.publicClient.simulateContract({
        account: localDevAccount,
        address: aaveV3Fuji.poolAddress,
        abi: poolAbi,
        functionName: 'supply',
        args: [this.usdcAddress, action.amount.value, localDevAccount.address, 0],
      });
      const reference = await this.walletClient.writeContract(supply.request);
      stages.push('SUBMITTED');
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: reference,
        timeout: 20_000,
      });
      if (receipt.status !== 'success')
        return failed(action, 'The Aave supply transaction reverted.', stages);
      const portfolio = await this.portfolio();
      return {
        actionId: action.id,
        reference,
        ...(approvalReference ? { approvalReference } : {}),
        state: 'CONFIRMED',
        confirmedAt: new Date(),
        stages: [...stages, 'CONFIRMED'],
        portfolio,
      };
    } catch (error) {
      console.warn(
        'local_aave_execution_failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return failed(action, 'The local Aave supply could not be prepared or confirmed.', stages);
    }
  }

  private async portfolio(): Promise<Portfolio> {
    const walletPortfolio = await new AvalancheFujiAdapter(
      this.rpcUrl,
      parseFujiTokens(undefined, this.usdcAddress),
      new ConfiguredFujiPrices(),
    ).getPortfolio(localDevAccount.address, { id: 'avalanche-fuji' });
    const reserve = await this.publicClient.readContract({
      address: aaveV3Fuji.poolDataProviderAddress,
      abi: dataProviderAbi,
      functionName: 'getUserReserveData',
      args: [this.usdcAddress, localDevAccount.address],
    });
    const supplied = reserve[0];
    return {
      ...walletPortfolio,
      positions: [
        ...walletPortfolio.positions,
        {
          asset: { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true },
          amount: atomic(supplied, 6),
          value: usd(supplied),
          location: 'SUPPLIED',
          protocolId: aaveV3Fuji.id,
        },
      ],
    };
  }
}
