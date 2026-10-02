import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
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
import { getBase58Decoder } from '@solana/codecs-strings';
import { getTransferSolInstruction } from '@solana-program/system';
import { atomic, type TransferAction } from '@/domain';
import { nativeSol, solanaChain } from './solana-portfolio-source';
import type { SolanaCluster } from './solana-config';

const lamportsPerSol = 1_000_000_000n;
const maxLamports = 18_446_744_073_709_551_615n;
export const solanaNativeTransferScope = 'solana-native';

export class SolanaTransferValidationError extends Error {}

export type SolanaTransferInput = Readonly<{
  sender: string;
  recipient: string;
  amountSol: string;
  cluster: SolanaCluster;
  portfolioId: string;
  policyVersion?: number;
  now?: Date;
}>;

export type SolanaTransferRpc = Readonly<{
  getBalance(
    wallet: Address,
    config: Readonly<{ commitment: 'confirmed' }>,
  ): Readonly<{ send: () => Promise<Readonly<{ value: bigint }>> }>;
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

type PreparedTransfer = Readonly<{
  action: TransferAction;
  message: ReturnType<typeof buildNativeSolTransferMessage>;
}>;

export type SolanaTransferSimulation = Readonly<{
  action: TransferAction;
  network: SolanaCluster;
}>;

export type SolanaTransferConfirmation = Readonly<{
  action: TransferAction;
  reference: string;
  confirmedAt: Date;
}>;

export function solToLamports(value: string): bigint {
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,9})?$/.test(normalized))
    throw new SolanaTransferValidationError(
      'Enter a positive SOL amount with at most nine decimals.',
    );
  const [whole = '0', fraction = ''] = normalized.split('.');
  const lamports = BigInt(whole) * lamportsPerSol + BigInt(fraction.padEnd(9, '0') || '0');
  if (lamports <= 0n || lamports > maxLamports)
    throw new SolanaTransferValidationError('Enter a valid positive SOL amount.');
  return lamports;
}

/** Normalizes user transfer input into a chain-agnostic action. */
export function normalizeSolTransferAction(input: SolanaTransferInput): TransferAction {
  let sender: Address;
  let recipient: Address;
  try {
    sender = address(input.sender);
    recipient = address(input.recipient.trim());
  } catch {
    throw new SolanaTransferValidationError('Enter a valid Solana recipient address.');
  }
  if (sender === recipient)
    throw new SolanaTransferValidationError(
      'The recipient must be different from the connected wallet.',
    );
  const now = input.now ?? new Date();
  return {
    id: crypto.randomUUID(),
    type: 'TRANSFER',
    walletId: sender,
    chain: solanaChain(input.cluster),
    asset: nativeSol,
    amount: atomic(solToLamports(input.amountSol), nativeSol.decimals),
    recipient,
    protocolId: solanaNativeTransferScope,
    protocolType: 'NATIVE',
    policyVersion: input.policyVersion ?? 0,
    portfolioId: input.portfolioId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 60_000),
  };
}

/** Builds one legacy native-SOL transfer message. No signature is requested here. */
export function buildNativeSolTransferMessage(
  action: TransferAction,
  payer: TransactionSigner,
  latestBlockhash: Readonly<{ blockhash: string; lastValidBlockHeight: bigint }>,
) {
  const sender = address(action.walletId);
  if (payer.address !== sender)
    throw new SolanaTransferValidationError(
      'The connected wallet does not match the transfer sender.',
    );
  return setTransactionMessageLifetimeUsingBlockhash(
    latestBlockhash as Parameters<typeof setTransactionMessageLifetimeUsingBlockhash>[0],
    appendTransactionMessageInstructions(
      [
        getTransferSolInstruction({
          source: payer,
          destination: address(action.recipient),
          amount: action.amount.value,
        }),
      ],
      setTransactionMessageFeePayerSigner(payer, createTransactionMessage({ version: 'legacy' })),
    ),
  );
}

export class SolanaTransferExecutor {
  private readonly prepared = new Map<string, PreparedTransfer>();

  constructor(
    private readonly dependencies: Readonly<{
      cluster: SolanaCluster;
      rpc: SolanaTransferRpc;
      payer: () => TransactionSigner;
    }>,
  ) {}

  async simulate(action: TransferAction): Promise<SolanaTransferSimulation> {
    this.assertSupportedAction(action);
    const payer = this.dependencies.payer();
    const sender = address(action.walletId);
    const balance = (
      await this.dependencies.rpc.getBalance(sender, { commitment: 'confirmed' }).send()
    ).value;
    if (action.amount.value >= balance)
      throw new SolanaTransferValidationError(
        'Insufficient SOL balance after reserving network fees.',
      );

    const latestBlockhash = (
      await this.dependencies.rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()
    ).value;
    const message = buildNativeSolTransferMessage(action, payer, latestBlockhash);
    const unsignedTransaction = getBase64EncodedWireTransaction(compileTransaction(message));
    const simulation = await this.dependencies.rpc
      .simulateTransaction(unsignedTransaction, {
        commitment: 'confirmed',
        encoding: 'base64',
        sigVerify: false,
      })
      .send();
    if (simulation.value.err)
      throw new Error('The Solana network simulation rejected this transfer.');

    this.prepared.set(action.id, { action, message });
    return { action, network: this.dependencies.cluster };
  }

  async submit(actionId: string): Promise<SolanaTransferConfirmation> {
    const prepared = this.prepared.get(actionId);
    if (!prepared) throw new Error('Simulate this transfer before requesting wallet approval.');
    this.prepared.delete(actionId);

    let reference: Signature;
    const payer = this.dependencies.payer();
    if (isTransactionModifyingSigner(payer) || isTransactionPartialSigner(payer)) {
      const signedTransaction = await signTransactionMessageWithSigners(prepared.message);
      reference = await this.dependencies.rpc
        .sendTransaction(getBase64EncodedWireTransaction(signedTransaction), {
          encoding: 'base64',
          preflightCommitment: 'confirmed',
        })
        .send();
    } else {
      if (this.dependencies.cluster === 'localnet')
        throw new Error('Localnet transfers require a wallet that supports transaction signing.');
      const signatureBytes = await signAndSendTransactionMessageWithSigners(prepared.message);
      reference = getBase58Decoder().decode(signatureBytes) as Signature;
    }
    await waitForSolTransferConfirmation(this.dependencies.rpc, reference);
    return { action: prepared.action, reference, confirmedAt: new Date() };
  }

  private assertSupportedAction(action: TransferAction) {
    if (
      action.type !== 'TRANSFER' ||
      action.chain.id !== solanaChain(this.dependencies.cluster).id ||
      action.asset.id !== nativeSol.id ||
      action.amount.decimals !== nativeSol.decimals ||
      action.protocolId !== solanaNativeTransferScope
    )
      throw new SolanaTransferValidationError('Unsupported Solana transfer action.');
  }
}

export async function waitForSolTransferConfirmation(
  rpc: SolanaTransferRpc,
  signature: Signature,
  options: Readonly<{
    attempts?: number;
    wait?: (milliseconds: number) => Promise<void>;
  }> = {},
): Promise<void> {
  const attempts = options.attempts ?? 20;
  const wait =
    options.wait ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const status = (
      await rpc.getSignatureStatuses([signature], { searchTransactionHistory: true }).send()
    ).value[0];
    if (status?.err) throw new Error('The submitted Solana transfer failed during confirmation.');
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized')
      return;
    if (attempt + 1 < attempts) await wait(750);
  }
  throw new Error('The submitted Solana transfer was not confirmed in time.');
}
