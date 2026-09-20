import type { AssetId, ChainRef } from '../portfolio';
import type { ProtocolId } from '../policy';

// Amount is a positive human-readable decimal, never transaction calldata.
export type PlannedSupply = Readonly<{
  type: 'SUPPLY';
  asset: AssetId;
  amount: string;
  protocol: ProtocolId;
  chain: ChainRef['id'];
}>;

export type ActionPlan = Readonly<{
  summary: string;
  reasoning: string;
  steps: readonly string[];
  proposedActions: readonly PlannedSupply[];
}>;
