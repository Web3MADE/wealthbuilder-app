import type { AtomicAmount } from '../money/index';
import type { AssetRef, ChainRef, WalletId } from '../portfolio/index';
import type { ProtocolId } from '../policy/index';

export type ActionState =
  | 'GENERATED'
  | 'VALIDATED'
  | 'DECIDED'
  | 'PENDING_APPROVAL'
  | 'AUTONOMOUS_AUTHORIZED'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'BLOCKED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';
export type SupplyAction = Readonly<{
  id: string;
  type: 'SUPPLY';
  walletId: WalletId;
  chain: ChainRef;
  asset: AssetRef;
  amount: AtomicAmount;
  protocolId: ProtocolId;
  protocolType: 'LENDING';
  policyVersion: number;
  portfolioId: string;
  expiresAt: Date;
  createdAt: Date;
}>;
export type ProposedAction = SupplyAction;
const transitions: Readonly<Record<ActionState, readonly ActionState[]>> = {
  GENERATED: ['VALIDATED', 'FAILED', 'EXPIRED', 'CANCELLED'],
  VALIDATED: ['DECIDED', 'FAILED', 'EXPIRED', 'CANCELLED'],
  DECIDED: ['PENDING_APPROVAL', 'AUTONOMOUS_AUTHORIZED', 'BLOCKED', 'FAILED', 'EXPIRED'],
  PENDING_APPROVAL: ['SUBMITTED', 'CANCELLED', 'EXPIRED'],
  AUTONOMOUS_AUTHORIZED: ['SUBMITTED', 'CANCELLED', 'EXPIRED'],
  SUBMITTED: ['CONFIRMED', 'FAILED'],
  CONFIRMED: [],
  BLOCKED: [],
  FAILED: [],
  EXPIRED: [],
  CANCELLED: [],
};
export const canTransition = (from: ActionState, to: ActionState): boolean =>
  transitions[from].includes(to);
