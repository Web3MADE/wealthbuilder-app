import type { WalletId } from '../portfolio/index';
export type AuditEventType =
  | 'PolicyCreated'
  | 'RecommendationGenerated'
  | 'PolicyEvaluated'
  | 'ActionApproved'
  | 'ExecutionSubmitted'
  | 'ExecutionConfirmed'
  | 'ExecutionFailed';
export type AuditEvent = Readonly<{
  id: string;
  walletId: WalletId;
  actionId?: string;
  type: AuditEventType;
  actor: 'USER' | 'AI' | 'SYSTEM';
  occurredAt: Date;
  metadata: Readonly<Record<string, string>>;
}>;
