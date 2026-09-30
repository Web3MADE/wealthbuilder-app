import {
  address,
  createNoopSigner,
  getBase58Decoder,
  type Signature,
  type TransactionSigner,
} from '@solana/kit';
import { parseTransferSolInstruction } from '@solana-program/system';
import { describe, expect, it, vi } from 'vitest';
import {
  buildNativeSolTransferMessage,
  normalizeSolTransferAction,
  SolanaTransferExecutor,
  SolanaTransferValidationError,
  waitForSolTransferConfirmation,
  type SolanaTransferRpc,
} from '../src/infrastructure/solana/solana-transfer';

const sender = address('B9Lf9z5BfNPT4d5KMeaBFx8x1G4CULZYR1jA2kmxRDka');
const recipient = address('9fYLFVoVqwH37C3dyPi6cpeobfbQ2jtLpN5HgAYDDdkm');
const blockhash = '11111111111111111111111111111111';
const reference = getBase58Decoder().decode(new Uint8Array(64)) as Signature;

function action(cluster: 'devnet' | 'localnet' = 'devnet') {
  return normalizeSolTransferAction({
    sender,
    recipient,
    amountSol: '0.25',
    cluster,
    portfolioId: 'portfolio-1',
    now: new Date('2026-09-26T00:00:00.000Z'),
  });
}

function rpc(overrides: Partial<SolanaTransferRpc> = {}): SolanaTransferRpc {
  return {
    getBalance: () => ({ send: async () => ({ value: 2_000_000_000n }) }),
    getLatestBlockhash: () => ({
      send: async () => ({ value: { blockhash, lastValidBlockHeight: 100n } }),
    }),
    simulateTransaction: () => ({ send: async () => ({ value: { err: null, logs: [] } }) }),
    sendTransaction: () => ({ send: async () => reference }),
    getSignatureStatuses: () => ({
      send: async () => ({ value: [{ confirmationStatus: 'confirmed', err: null }] }),
    }),
    ...overrides,
  };
}

describe('Solana native transfer', () => {
  it('normalizes a SOL transfer into the shared transfer action shape', () => {
    const normalized = action('localnet');

    expect(normalized).toMatchObject({
      type: 'TRANSFER',
      chain: { id: 'solana-localnet' },
      asset: { id: 'sol', decimals: 9 },
      recipient,
      protocolId: 'solana-native',
      protocolType: 'NATIVE',
    });
    expect(normalized.amount.value).toBe(250_000_000n);
  });

  it('constructs a native system transfer instruction with the selected sender and recipient', () => {
    const message = buildNativeSolTransferMessage(action(), createNoopSigner(sender), {
      blockhash,
      lastValidBlockHeight: 100n,
    });
    const instruction = parseTransferSolInstruction(message.instructions[0]!);

    expect(instruction.accounts.source.address).toBe(sender);
    expect(instruction.accounts.destination.address).toBe(recipient);
    expect(instruction.data.amount).toBe(250_000_000n);
  });

  it.each([
    ['invalid recipient', { recipient: 'not-a-solana-address', amountSol: '0.01' }],
    ['zero amount', { recipient, amountSol: '0' }],
    ['too many decimals', { recipient, amountSol: '0.0000000001' }],
  ])('rejects %s before building a transfer', (_, input) => {
    expect(() =>
      normalizeSolTransferAction({
        sender,
        cluster: 'devnet',
        portfolioId: 'portfolio-1',
        ...input,
      }),
    ).toThrow(SolanaTransferValidationError);
  });

  it('refuses a transfer when the sender does not retain SOL for fees', async () => {
    const transfer = action();
    const getLatestBlockhash = vi.fn();
    const executor = new SolanaTransferExecutor({
      cluster: 'devnet',
      rpc: rpc({
        getBalance: () => ({ send: async () => ({ value: transfer.amount.value }) }),
        getLatestBlockhash,
      }),
      payer: () => createNoopSigner(sender),
    });

    await expect(executor.simulate(transfer)).rejects.toThrow('Insufficient SOL balance');
    expect(getLatestBlockhash).not.toHaveBeenCalled();
  });

  it('does not make a transfer available for signing when simulation fails', async () => {
    const executor = new SolanaTransferExecutor({
      cluster: 'devnet',
      rpc: rpc({
        simulateTransaction: () => ({
          send: async () => ({
            value: { err: { InstructionError: [0, 'InsufficientFunds'] }, logs: [] },
          }),
        }),
      }),
      payer: () => createNoopSigner(sender),
    });
    const transfer = action();

    await expect(executor.simulate(transfer)).rejects.toThrow('simulation rejected');
    await expect(executor.submit(transfer.id)).rejects.toThrow('Simulate this transfer');
  });

  it('rejects a simulated transfer when its selected cluster changes', async () => {
    const executor = new SolanaTransferExecutor({
      cluster: 'localnet',
      rpc: rpc(),
      payer: () => createNoopSigner(sender),
    });

    await expect(executor.simulate(action('devnet'))).rejects.toThrow(
      'Unsupported Solana transfer',
    );
  });

  it('does not allow a send-only wallet to broadcast a localnet transfer to another network', async () => {
    const sendOnlyPayer = {
      address: sender,
      signAndSendTransactions: vi.fn(),
    } as unknown as TransactionSigner;
    const executor = new SolanaTransferExecutor({
      cluster: 'localnet',
      rpc: rpc(),
      payer: () => sendOnlyPayer,
    });
    const transfer = action('localnet');

    await executor.simulate(transfer);
    await expect(executor.submit(transfer.id)).rejects.toThrow('Localnet transfers require');
  });

  it('waits for confirmed status and surfaces a confirmed transaction failure', async () => {
    const getSignatureStatuses = vi
      .fn()
      .mockReturnValueOnce({ send: async () => ({ value: [null] }) })
      .mockReturnValueOnce({
        send: async () => ({ value: [{ confirmationStatus: 'confirmed', err: null }] }),
      });
    const wait = vi.fn(async () => undefined);

    await expect(
      waitForSolTransferConfirmation(rpc({ getSignatureStatuses }), reference, {
        attempts: 2,
        wait,
      }),
    ).resolves.toBeUndefined();
    expect(wait).toHaveBeenCalledWith(750);

    await expect(
      waitForSolTransferConfirmation(
        rpc({
          getSignatureStatuses: () => ({
            send: async () => ({ value: [{ confirmationStatus: 'confirmed', err: 'failed' }] }),
          }),
        }),
        reference,
        { attempts: 1 },
      ),
    ).rejects.toThrow('failed during confirmation');
  });
});
