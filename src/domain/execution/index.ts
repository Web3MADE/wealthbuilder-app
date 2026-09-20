import type { Money } from '../money/index';
import type { Portfolio } from '../portfolio/index';
export type ExecutionAuthorization = Readonly<{
  id: string;
  actionId: string;
  mode: 'WALLET_APPROVAL' | 'SESSION_PERMISSION';
  expiresAt: Date;
  maxCumulativeValue?: Money;
}>;
export type ExecutionHandle = Readonly<{ id: string; actionId: string }>;
export type ExecutionPreview = Readonly<{
  handle: ExecutionHandle;
  summary: string;
  steps: readonly string[];
}>;
export type ExecutionSubmission = Readonly<{
  actionId: string;
  reference: string;
  submittedAt: Date;
}>;
export type ExecutionResult = Readonly<{
  actionId: string;
  reference?: string;
  state: 'CONFIRMED' | 'FAILED';
  confirmedAt?: Date;
  failureReason?: string;
  approvalReference?: string;
  stages: readonly ('PREPARING' | 'SIMULATING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED')[];
  portfolio?: Portfolio;
}>;
