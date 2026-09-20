import { NextResponse } from 'next/server';
import { z } from 'zod';
import { executeApprovedAction } from '@/application/execute-approved-action-service';
import { LocalDevAaveExecutor } from '@/infrastructure/dev/local-dev-aave-executor';
import { devChatContextStore } from '@/infrastructure/dev/chat-context-store';
import { devChatExecutionStore } from '@/infrastructure/dev/chat-execution-store';

export const runtime = 'nodejs';

const requestSchema = z.object({
  actionId: z.string().uuid(),
  confirmedByUser: z.boolean(),
}).strict();
const contextStore = devChatContextStore();
const executionStore = devChatExecutionStore();

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid execution request.' }, { status: 400 });
  const pending = executionStore.consume(parsed.data.actionId);
  if (!pending)
    return NextResponse.json({ error: 'This action was already executed, expired, or is unavailable.' }, { status: 409 });
  try {
    const context = await contextStore.load();
    const result = await executeApprovedAction(
      new LocalDevAaveExecutor(process.env.FUJI_RPC_URL || 'http://127.0.0.1:8545'),
      {
        action: pending.action,
        decision: pending.decision,
        confirmedByUser: parsed.data.confirmedByUser,
        activePolicyVersion: context.policy.version,
      },
    );
    if (result.portfolio) contextStore.recordPortfolio(result.portfolio);
    const { portfolio: _portfolio, ...serializableResult } = result;
    return NextResponse.json({ result: serializableResult });
  } catch {
    return NextResponse.json({ error: 'Local fork execution is unavailable. Start the Fuji fork and configure FUJI_RPC_URL.' }, { status: 503 });
  }
}
