import { createPublicClient, http, type Hash } from 'viem';
import { avalancheFuji as viemFuji } from 'viem/chains';
import type { ChainPort } from '@/application/interfaces/chain';
import type { ChainRef, ExecutionResult, ExecutionSubmission, Portfolio, WalletId } from '@/domain';

export class EvmChainAdapter implements ChainPort {
  private readonly client;
  constructor(
    private readonly chainRef: ChainRef,
    rpcUrl: string,
    private readonly portfolioReader: (walletId: WalletId) => Promise<Portfolio>,
    private readonly explorer: (reference: string) => string,
  ) {
    this.client = createPublicClient({ chain: viemFuji, transport: http(rpcUrl) });
  }
  getPortfolio(walletId: WalletId, chain: ChainRef): Promise<Portfolio> {
    return chain.id === this.chainRef.id
      ? this.portfolioReader(walletId)
      : Promise.reject(new Error('Unsupported chain.'));
  }
  async confirm(submission: ExecutionSubmission): Promise<ExecutionResult> {
    try {
      await this.client.waitForTransactionReceipt({
        hash: submission.reference as Hash,
        confirmations: 1,
      });
      return {
        actionId: submission.actionId,
        reference: submission.reference,
        state: 'CONFIRMED',
        confirmedAt: new Date(),
      };
    } catch {
      return {
        actionId: submission.actionId,
        reference: submission.reference,
        state: 'FAILED',
        failureReason: 'Unable to confirm the submitted transaction.',
      };
    }
  }
  explorerUrl(reference: string): string {
    return this.explorer(reference);
  }
}
