import { encodeFunctionData, getAddress, type Address } from 'viem';
import type { ProtocolDeploymentConfig } from '@/config';
import type {
  CapabilityQuery,
  ProtocolCapability,
  ProtocolPort,
} from '@/application/interfaces/protocol';
import type {
  ExecutionAuthorization,
  ExecutionPreview,
  ExecutionSubmission,
  ProposedAction,
} from '@/domain';

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
type StoredPlan = Readonly<{
  action: ProposedAction;
  authorization: ExecutionAuthorization;
  data: `0x${string}`;
}>;
export class AaveV3ProtocolAdapter implements ProtocolPort {
  private readonly plans = new Map<string, StoredPlan>();
  constructor(
    private readonly config: ProtocolDeploymentConfig,
    private readonly resolveWalletAddress: (walletId: string) => Address,
    private readonly submit: (
      request: Readonly<{ to: Address; data: `0x${string}` }>,
    ) => Promise<string>,
  ) { }
  describeCapabilities(): readonly ProtocolCapability[] {
    return [
      {
        protocolId: this.config.id,
        protocolType: 'LENDING',
        chain: this.config.chain,
        supportedActions: ['SUPPLY'],
        supportedAssetIds: Object.keys(this.config.assets),
        authorizationModes: ['WALLET_APPROVAL'],
        riskTier: this.config.riskTier,
        configurationVersion: this.config.version,
      },
    ];
  }
  supports(query: CapabilityQuery): boolean {
    return this.describeCapabilities().some(
      (capability) =>
        capability.chain.id === query.chain.id &&
        capability.supportedActions.includes(query.action) &&
        capability.supportedAssetIds.includes(query.assetId) &&
        capability.authorizationModes.includes(query.authorization),
    );
  }
  async prepare(
    action: ProposedAction,
    authorization: ExecutionAuthorization,
  ): Promise<ExecutionPreview> {
    if (
      !this.supports({
        action: action.type,
        assetId: action.asset.id,
        chain: action.chain,
        authorization: authorization.mode,
      })
    )
      throw new Error('Unsupported Aave capability.');
    const assetAddress = this.config.assets[action.asset.id];
    if (!assetAddress) throw new Error('Asset deployment is not configured.');
    const data = encodeFunctionData({
      abi: poolAbi,
      functionName: 'supply',
      args: [
        getAddress(assetAddress),
        action.amount.value,
        this.resolveWalletAddress(action.walletId),
        0,
      ],
    });
    const handle = { id: crypto.randomUUID(), actionId: action.id };
    this.plans.set(handle.id, { action, authorization, data });
    return {
      handle,
      summary: `Supply ${action.asset.symbol} to Aave V3`,
      steps: [
        'Approve the exact token allowance in the wallet.',
        'Supply the approved amount to Aave V3.',
      ],
    };
  }
  async execute(
    handle: ExecutionPreview['handle'],
    authorization: ExecutionAuthorization,
  ): Promise<ExecutionSubmission> {
    const plan = this.plans.get(handle.id);
    if (
      !plan ||
      plan.action.id !== handle.actionId ||
      plan.authorization.id !== authorization.id ||
      authorization.expiresAt <= new Date()
    )
      throw new Error('Execution handle is invalid or expired.');
    const reference = await this.submit({
      to: getAddress(this.config.poolAddress),
      data: plan.data,
    });
    return { actionId: handle.actionId, reference, submittedAt: new Date() };
  }
}
