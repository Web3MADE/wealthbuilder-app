import { NextResponse } from 'next/server';
import { z } from 'zod';
import { executeApprovedAction } from '@/application/execute-approved-action-service';
import { devChatContextStore } from '@/infrastructure/dev/chat-context-store';
import { devChatExecutionStore } from '@/infrastructure/dev/chat-execution-store';
import { devActivityStore } from '@/infrastructure/dev/dev-activity-store';
import { ZeroDevSmartAccountExecutor } from '@/infrastructure/zerodev/zerodev-smart-account-executor';
import { ZeroDevKernelSessionManager } from '@/infrastructure/zerodev/zerodev-kernel-session';
import { zeroDevServerConfig } from '@/infrastructure/zerodev/zerodev-server-config';

export const runtime = 'nodejs';

const requestSchema = z.object({
  actionId: z.string().uuid(),
  confirmedByUser: z.boolean(),
  smartAccountAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  // ZeroDev keeps the serialized session permission server-side; the browser
  // sends this opaque handle only to preserve the presentation port shape.
  permissionId: z.string().min(1).max(128),
}).strict();
const contextStore = devChatContextStore();
const executionStore = devChatExecutionStore();
const activityStore = devActivityStore();

function formatUsdc(value: bigint) {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction} USDC` : `${whole} USDC`;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid execution request.' }, { status: 400 });
  const pending = executionStore.consume(parsed.data.actionId);
  if (!pending)
    return NextResponse.json({ error: 'This action was already executed, expired, or is unavailable.' }, { status: 409 });
  try {
    const config = zeroDevServerConfig();
    if (!config) {
      executionStore.release(parsed.data.actionId);
      return NextResponse.json({ error: 'Your WealthBuilder Account is unavailable right now. Please try again.', retryable: true }, { status: 503 });
    }
    // API routes use isolated server bundles in development. Recreate the same
    // bounded, short-lived session from the already-approved domain action.
    const session = await new ZeroDevKernelSessionManager(config).createSession(pending.action.amount.value);
    if (session.smartAccountAddress.toLowerCase() !== parsed.data.smartAccountAddress.toLowerCase())
      return NextResponse.json({ error: 'This account cannot prepare the requested action.' }, { status: 403 });
    const context = await contextStore.load(parsed.data.smartAccountAddress);
    const result = await executeApprovedAction(
      new ZeroDevSmartAccountExecutor(config, { smartAccountAddress: session.smartAccountAddress, serializedPermissionAccount: session.serializedPermissionAccount }),
      {
        action: pending.action,
        decision: pending.decision,
        confirmedByUser: parsed.data.confirmedByUser,
        activePolicyVersion: context.policy.version,
      },
    );
    if (result.portfolio) contextStore.recordPortfolio(result.portfolio);
    const retryable = result.state === 'FAILED' && !result.stages?.includes('SUBMITTED');
    if (retryable) executionStore.release(parsed.data.actionId);
    const portfolio = result.portfolio && {
      walletUsdc: formatUsdc(result.portfolio.positions.find((position) => position.location === 'WALLET' && position.asset.id === 'usdc')?.amount.value ?? 0n),
      suppliedUsdc: formatUsdc(result.portfolio.positions.find((position) => position.location === 'SUPPLIED' && position.asset.id === 'usdc')?.amount.value ?? 0n),
    };
    const { portfolio: _portfolio, failureReason: _failureReason, ...serializableResult } = result;
    if (result.state === 'CONFIRMED') {
      activityStore.record({
        kind: 'SUPPLY_CONFIRMED',
        title: `Supplied ${formatUsdc(pending.action.amount.value)} to Aave`,
        description: 'Your supplied USDC position has been updated.',
        status: 'completed',
        amount: formatUsdc(pending.action.amount.value),
        details: { network: 'Avalanche Fuji', account: session.smartAccountAddress, executionStatus: 'Confirmed', ...(result.reference ? { reference: result.reference } : {}) },
      });
    } else {
      activityStore.record({
        kind: 'EXECUTION_FAILED',
        title: `Couldn’t supply ${formatUsdc(pending.action.amount.value)} to Aave`,
        description: 'Your portfolio was not changed.',
        status: 'failed',
        amount: formatUsdc(pending.action.amount.value),
        details: { network: 'Avalanche Fuji', account: session.smartAccountAddress, executionStatus: 'Failed', ...(result.reference ? { reference: result.reference } : {}) },
      });
    }
    return NextResponse.json({ result: {
      ...serializableResult,
      retryable,
      ...(result.state === 'FAILED' ? { failureReason: 'We couldn’t complete this action. Your portfolio was not changed.' } : {}),
      ...(portfolio ? { portfolio } : {}),
    } });
  } catch {
    executionStore.release(parsed.data.actionId);
    return NextResponse.json({ error: 'Your account could not prepare this action. Please try again.', retryable: true }, { status: 503 });
  }
}
