import type { ChainRef, ExecutionResult, ExecutionSubmission, Portfolio, WalletId } from '@/domain';
export interface ChainPort {
  getPortfolio(walletId: WalletId, chain: ChainRef): Promise<Portfolio>;
  confirm(submission: ExecutionSubmission): Promise<ExecutionResult>;
  explorerUrl(reference: string): string;
}
