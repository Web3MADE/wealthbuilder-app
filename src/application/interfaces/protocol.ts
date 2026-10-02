import type {
  ChainRef,
  ExecutionAuthorization,
  ExecutionPreview,
  ExecutionSubmission,
  ProposedAction,
  ActionType,
} from '@/domain';
export type CapabilityQuery = Readonly<{
  action: ActionType;
  assetId: string;
  chain: ChainRef;
  authorization: ExecutionAuthorization['mode'];
}>;
export type ProtocolCapability = Readonly<{
  protocolId: string;
  protocolType: 'LENDING';
  chain: ChainRef;
  supportedActions: readonly ['SUPPLY'];
  supportedAssetIds: readonly string[];
  authorizationModes: readonly ExecutionAuthorization['mode'][];
  riskTier: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  configurationVersion: string;
}>;
export interface ProtocolPort {
  describeCapabilities(): readonly ProtocolCapability[];
  supports(query: CapabilityQuery): boolean;
  prepare(action: ProposedAction, authorization: ExecutionAuthorization): Promise<ExecutionPreview>;
  execute(
    handle: ExecutionPreview['handle'],
    authorization: ExecutionAuthorization,
  ): Promise<ExecutionSubmission>;
}
export interface ProtocolRegistryPort {
  findSupport(query: CapabilityQuery): Promise<readonly ProtocolCapability[]>;
  get(protocolId: string): ProtocolPort | null;
}
