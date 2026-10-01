import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getAddressEncoder,
  getBase58Decoder,
  getBase64EncodedWireTransaction,
  getProgramDerivedAddress,
  isTransactionModifyingSigner,
  isTransactionPartialSigner,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  signTransactionMessageWithSigners,
  type Address,
  type Base64EncodedWireTransaction,
  type Signature,
  type TransactionSigner,
} from '@solana/kit';
import { jitoSolDeployment, jitoSolOpportunityId } from './jito-sol-config';
import { type SolanaCluster } from './solana-config';

const associatedTokenProgram = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const systemProgram = address('11111111111111111111111111111111');
const tokenProgram = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const feeReserveLamports = 10_000_000n;
const stakePoolAccountMinimumSize = 258;

type JitoRpc = Readonly<{
  getBalance(
    wallet: Address,
    config: Readonly<{ commitment: 'confirmed' }>,
  ): Readonly<{ send: () => Promise<Readonly<{ value: bigint }>> }>;
  getAccountInfo(
    account: Address,
    config: Readonly<{ commitment: 'confirmed'; encoding: 'base64' }>,
  ): Readonly<{
    send: () => Promise<
      Readonly<{
        value: Readonly<{ owner: string; data: readonly [string, 'base64'] }> | null;
      }>
    >;
  }>;
  getLatestBlockhash(config: Readonly<{ commitment: 'confirmed' }>): Readonly<{
    send: () => Promise<
      Readonly<{ value: Readonly<{ blockhash: string; lastValidBlockHeight: bigint }> }>
    >;
  }>;
  simulateTransaction(
    transaction: Base64EncodedWireTransaction,
    config: Readonly<{ commitment: 'confirmed'; encoding: 'base64'; sigVerify: false }>,
  ): Readonly<{
    send: () => Promise<
      Readonly<{ value: Readonly<{ err: unknown; logs: readonly string[] | null }> }>
    >;
  }>;
  sendTransaction(
    transaction: Base64EncodedWireTransaction,
    config: Readonly<{ encoding: 'base64'; preflightCommitment: 'confirmed' }>,
  ): Readonly<{ send: () => Promise<Signature> }>;
  getSignatureStatuses(
    signatures: readonly Signature[],
    config: Readonly<{ searchTransactionHistory: true }>,
  ): Readonly<{
    send: () => Promise<
      Readonly<{
        value: readonly (Readonly<{ confirmationStatus: string | null; err: unknown }> | null)[];
      }>
    >;
  }>;
}>;

export type JitoSolExecutionStage =
  | 'preparing'
  | 'awaiting-approval'
  | 'submitted'
  | 'confirming'
  | 'confirmed'
  | 'rejected'
  | 'failed';

export type JitoSolConfirmation = Readonly<{
  signature: string;
  depositedLamports: bigint;
  confirmedAt: Date;
}>;

type PreparedJitoDeposit = Readonly<{
  message: Awaited<ReturnType<typeof buildJitoSolDepositMessage>>;
  depositedLamports: bigint;
}>;

export class JitoSolExecutionError extends Error {}

/**
 * A narrowly scoped Devnet executor for the reviewed JitoSOL opportunity. The
 * transaction is built solely from deployment config and current pool state.
 */
export class JitoSolExecutor {
  constructor(
    private readonly dependencies: Readonly<{
      cluster: SolanaCluster;
      rpc: JitoRpc;
      payer: () => TransactionSigner;
    }>,
  ) {}

  async execute(
    input: Readonly<{
      opportunityId: string;
      allocationPercent: number;
      onStage: (stage: JitoSolExecutionStage) => void;
    }>,
  ): Promise<JitoSolConfirmation> {
    input.onStage('preparing');
    let prepared: PreparedJitoDeposit;
    try {
      prepared = await this.prepare(input.opportunityId, input.allocationPercent);
    } catch (error) {
      input.onStage('failed');
      throw userFacingPreparationError(error);
    }
    input.onStage('awaiting-approval');

    let signature: Signature;
    const payer = this.dependencies.payer();
    try {
      if (isTransactionModifyingSigner(payer) || isTransactionPartialSigner(payer)) {
        const signed = await signTransactionMessageWithSigners(prepared.message);
        signature = await this.dependencies.rpc
          .sendTransaction(getBase64EncodedWireTransaction(signed), {
            encoding: 'base64',
            preflightCommitment: 'confirmed',
          })
          .send();
      } else {
        signature = getBase58Decoder().decode(
          await signAndSendTransactionMessageWithSigners(prepared.message),
        ) as Signature;
      }
      input.onStage('submitted');
    } catch (error) {
      if (error instanceof Error && /reject|declin|cancel/i.test(error.message)) {
        input.onStage('rejected');
        throw new JitoSolExecutionError('Wallet approval was declined. No transaction was sent.');
      }
      input.onStage('failed');
      throw new JitoSolExecutionError(userFacingExecutionError(error));
    }

    input.onStage('confirming');
    try {
      await waitForJitoConfirmation(this.dependencies.rpc, signature);
    } catch (error) {
      input.onStage('failed');
      throw userFacingConfirmationError(error);
    }
    input.onStage('confirmed');
    return {
      signature,
      depositedLamports: prepared.depositedLamports,
      confirmedAt: new Date(),
    };
  }

  private async prepare(
    opportunityId: string,
    allocationPercent: number,
  ): Promise<PreparedJitoDeposit> {
    const deployment = jitoSolDeployment(this.dependencies.cluster);
    if (!deployment || opportunityId !== jitoSolOpportunityId)
      throw new JitoSolExecutionError(
        'This opportunity is not available on the active Solana network.',
      );
    if (!Number.isInteger(allocationPercent) || allocationPercent <= 0 || allocationPercent >= 100)
      throw new JitoSolExecutionError('The proposed JitoSOL allocation is invalid.');

    const payer = this.dependencies.payer();
    const balance = (
      await this.dependencies.rpc.getBalance(payer.address, { commitment: 'confirmed' }).send()
    ).value;
    const depositedLamports = (balance * BigInt(allocationPercent)) / 100n;
    if (depositedLamports <= 0n || depositedLamports + feeReserveLamports > balance)
      throw new JitoSolExecutionError(
        'Your SOL balance changed and no longer leaves enough for network fees. Refresh and try again.',
      );

    const poolState = await this.fetchVerifiedPoolState(deployment);
    const latestBlockhash = (
      await this.dependencies.rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()
    ).value;
    const message = await buildJitoSolDepositMessage({
      payer,
      deployment,
      poolState,
      depositedLamports,
      latestBlockhash,
    });
    const simulation = await this.dependencies.rpc
      .simulateTransaction(getBase64EncodedWireTransaction(compileTransaction(message)), {
        commitment: 'confirmed',
        encoding: 'base64',
        sigVerify: false,
      })
      .send();
    if (simulation.value.err)
      throw new JitoSolExecutionError(
        'The JitoSOL stake pool could not accept this deposit right now. No transaction was sent.',
      );
    return { message, depositedLamports };
  }

  private async fetchVerifiedPoolState(
    deployment: NonNullable<ReturnType<typeof jitoSolDeployment>>,
  ) {
    const poolAccount = await this.dependencies.rpc
      .getAccountInfo(address(deployment.stakePool), {
        commitment: 'confirmed',
        encoding: 'base64',
      })
      .send();
    if (!poolAccount.value)
      throw new JitoSolExecutionError('The JitoSOL stake pool is unavailable on Devnet.');
    if (poolAccount.value.owner !== deployment.stakePoolProgram)
      throw new JitoSolExecutionError(
        'The JitoSOL stake pool program did not match the configured deployment.',
      );
    const bytes = Uint8Array.from(atob(poolAccount.value.data[0]), (character) =>
      character.charCodeAt(0),
    );
    if (bytes.length < stakePoolAccountMinimumSize)
      throw new JitoSolExecutionError('The JitoSOL stake pool data is invalid.');

    const decodeAddress = (offset: number) =>
      address(getBase58Decoder().decode(bytes.slice(offset, offset + 32)));
    const poolMint = decodeAddress(162);
    if (poolMint !== address(deployment.mint))
      throw new JitoSolExecutionError('The JitoSOL mint did not match the configured deployment.');
    return {
      reserveStake: decodeAddress(130),
      poolMint,
      managerFeeAccount: decodeAddress(194),
    };
  }
}

async function buildJitoSolDepositMessage({
  payer,
  deployment,
  poolState,
  depositedLamports,
  latestBlockhash,
}: Readonly<{
  payer: TransactionSigner;
  deployment: NonNullable<ReturnType<typeof jitoSolDeployment>>;
  poolState: Readonly<{ reserveStake: Address; poolMint: Address; managerFeeAccount: Address }>;
  depositedLamports: bigint;
  latestBlockhash: Readonly<{ blockhash: string; lastValidBlockHeight: bigint }>;
}>) {
  const stakePool = address(deployment.stakePool);
  const stakePoolProgram = address(deployment.stakePoolProgram);
  const [withdrawAuthority] = await getProgramDerivedAddress({
    programAddress: stakePoolProgram,
    seeds: [getAddressEncoder().encode(stakePool), new TextEncoder().encode('withdraw')],
  });
  const [destinationTokenAccount] = await getProgramDerivedAddress({
    programAddress: associatedTokenProgram,
    seeds: [
      getAddressEncoder().encode(payer.address),
      getAddressEncoder().encode(tokenProgram),
      getAddressEncoder().encode(poolState.poolMint),
    ],
  });

  const createDestinationAccount = {
    programAddress: associatedTokenProgram,
    accounts: [
      writableSigner(payer),
      writable(destinationTokenAccount),
      readonly(payer.address),
      readonly(poolState.poolMint),
      readonly(systemProgram),
      readonly(tokenProgram),
    ],
    data: Uint8Array.of(1),
  };
  const data = new Uint8Array(9);
  data[0] = 14;
  new DataView(data.buffer).setBigUint64(1, depositedLamports, true);
  const depositSol = {
    programAddress: stakePoolProgram,
    accounts: [
      writable(stakePool),
      readonly(withdrawAuthority),
      writable(poolState.reserveStake),
      writableSigner(payer),
      writable(destinationTokenAccount),
      writable(poolState.managerFeeAccount),
      writable(destinationTokenAccount),
      writable(poolState.poolMint),
      readonly(systemProgram),
      readonly(tokenProgram),
    ],
    data,
  };
  return setTransactionMessageLifetimeUsingBlockhash(
    latestBlockhash as Parameters<typeof setTransactionMessageLifetimeUsingBlockhash>[0],
    appendTransactionMessageInstructions(
      [createDestinationAccount, depositSol],
      setTransactionMessageFeePayerSigner(payer, createTransactionMessage({ version: 'legacy' })),
    ),
  );
}

function readonly(account: Address) {
  return { address: account, role: 0 as const };
}

function writable(account: Address) {
  return { address: account, role: 1 as const };
}

function writableSigner(signer: TransactionSigner) {
  return { address: signer.address, role: 3 as const, signer };
}

async function waitForJitoConfirmation(rpc: JitoRpc, signature: Signature): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const status = (
      await rpc.getSignatureStatuses([signature], { searchTransactionHistory: true }).send()
    ).value[0];
    if (status?.err)
      throw new JitoSolExecutionError('The JitoSOL deposit failed during confirmation.');
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized')
      return;
    if (attempt < 19) await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new JitoSolExecutionError(
    'The JitoSOL deposit was not confirmed in time. Check your wallet.',
  );
}

function userFacingExecutionError(error: unknown): string {
  if (!(error instanceof Error)) return 'The wallet could not submit this JitoSOL deposit.';
  if (/network|chain|cluster/i.test(error.message))
    return 'Your wallet is not ready for Solana Devnet. Switch to Devnet and try again.';
  if (/disconnect|not connected/i.test(error.message))
    return 'Your wallet disconnected before the transaction could be sent. Reconnect and try again.';
  return 'The wallet could not submit this JitoSOL deposit. Please try again.';
}

function userFacingPreparationError(error: unknown): Error {
  if (error instanceof JitoSolExecutionError) return error;
  return new JitoSolExecutionError(
    'We could not prepare this JitoSOL deposit. Check your network connection and try again.',
  );
}

function userFacingConfirmationError(error: unknown): Error {
  if (error instanceof JitoSolExecutionError) return error;
  return new JitoSolExecutionError(
    'The transaction was submitted, but confirmation could not be checked. View your wallet or try again shortly.',
  );
}
