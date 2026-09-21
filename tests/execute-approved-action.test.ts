import { describe, expect, it, vi } from 'vitest';
import { executeApprovedAction } from '@/application/execute-approved-action-service';
import type { ExecutionPort } from '@/application/interfaces/execution';
import { DevChatExecutionStore } from '@/infrastructure/dev/chat-execution-store';
import { LocalDevAaveExecutor } from '@/infrastructure/dev/local-dev-aave-executor';

const now = new Date('2026-09-20T00:00:00.000Z');
const action = {
  id: 'action-1',
  type: 'SUPPLY' as const,
  walletId: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  chain: { id: 'avalanche-fuji' },
  asset: { id: 'usdc', symbol: 'USDC', decimals: 6, isStablecoin: true },
  amount: { value: 20_000_000n, decimals: 6 },
  protocolId: 'aave-v3',
  protocolType: 'LENDING' as const,
  policyVersion: 1,
  portfolioId: 'portfolio-1',
  createdAt: now,
  expiresAt: new Date('2026-09-20T00:05:00.000Z'),
};
const decision = (outcome: 'AUTONOMOUS_ALLOWED' | 'REQUIRES_APPROVAL' | 'BLOCKED') => ({
  outcome,
  actionValue: { currency: 'USD' as const, micros: 20_000_000n },
  violations: [],
  evaluatedAt: now,
});
const executor: ExecutionPort = {
  execute: vi.fn().mockResolvedValue({
    actionId: action.id,
    state: 'CONFIRMED',
    stages: ['PREPARING', 'SIMULATING', 'SUBMITTED', 'CONFIRMED'],
  }),
};

describe('approved action execution', () => {
  it('does not call infrastructure for blocked actions', async () => {
    const result = await executeApprovedAction(executor, {
      action,
      decision: decision('BLOCKED'),
      confirmedByUser: true,
      activePolicyVersion: 1,
      now,
    });
    expect(result.state).toBe('FAILED');
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it('requires explicit confirmation before approval-required actions execute', async () => {
    const result = await executeApprovedAction(executor, {
      action,
      decision: decision('REQUIRES_APPROVAL'),
      confirmedByUser: false,
      activePolicyVersion: 1,
      now,
    });
    expect(result.failureReason).toContain('Confirm');
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it('executes an unchanged approved action through the port', async () => {
    const result = await executeApprovedAction(executor, {
      action,
      decision: decision('AUTONOMOUS_ALLOWED'),
      confirmedByUser: false,
      activePolicyVersion: 1,
      now,
    });
    expect(result.state).toBe('CONFIRMED');
    expect(executor.execute).toHaveBeenCalledWith(action);
  });

  it('rejects unsupported protocol actions in the local Aave executor before any RPC call', async () => {
    const result = await new LocalDevAaveExecutor('http://127.0.0.1:8545').execute({
      ...action,
      protocolId: 'unapproved-protocol',
    });
    expect(result).toMatchObject({
      state: 'FAILED',
      failureReason: expect.stringContaining('Only USDC supply'),
    });
  });

  it('rejects duplicate pending execution IDs', () => {
    const store = new DevChatExecutionStore();
    store.register([{ actionIndex: 0, action, decision: decision('AUTONOMOUS_ALLOWED') }]);
    expect(store.consume(action.id)).not.toBeNull();
    expect(store.consume(action.id)).toBeNull();
  });

  it('returns a normalized failed result from a failed executor', async () => {
    const failed: ExecutionPort = {
      execute: vi.fn().mockResolvedValue({
        actionId: action.id,
        state: 'FAILED',
        failureReason: 'Simulation failed.',
        stages: ['PREPARING', 'SIMULATING', 'FAILED'],
      }),
    };
    await expect(
      executeApprovedAction(failed, {
        action,
        decision: decision('AUTONOMOUS_ALLOWED'),
        confirmedByUser: false,
        activePolicyVersion: 1,
        now,
      }),
    ).resolves.toMatchObject({ state: 'FAILED', failureReason: 'Simulation failed.' });
  });
});
