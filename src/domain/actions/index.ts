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
export type ActionType = 'SUPPLY' | 'TRANSFER';
export type ActionBase = Readonly<{
  id: string;
  walletId: WalletId;
  chain: ChainRef;
  asset: AssetRef;
  amount: AtomicAmount;
  protocolId: ProtocolId;
  policyVersion: number;
  portfolioId: string;
  expiresAt: Date;
  createdAt: Date;
}>;
export type SupplyAction = ActionBase &
  Readonly<{
    type: 'SUPPLY';
    protocolType: 'LENDING';
  }>;
export type TransferAction = ActionBase &
  Readonly<{
    type: 'TRANSFER';
    recipient: string;
    protocolType: 'NATIVE';
  }>;
export type ProposedAction = SupplyAction | TransferAction;
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
