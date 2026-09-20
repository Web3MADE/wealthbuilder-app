import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyChatPolicyChange, policyReservePercent } from '@/application/chat-policy-service';
import { devChatContextStore } from '@/infrastructure/dev/chat-context-store';

export const runtime = 'nodejs';

const requestSchema = z.object({
  type: z.literal('SET_MINIMUM_LIQUID_STABLE_RESERVE'),
  minimumLiquidStableReserveBps: z.number().int().min(0).max(10_000),
}).strict();
const contextStore = devChatContextStore();

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'The proposed policy change is invalid.' }, { status: 400 });
  try {
    const context = await contextStore.load();
    const policy = await applyChatPolicyChange(contextStore, context, parsed.data);
    return NextResponse.json({
      policy: {
        version: policy.version,
        minimumLiquidStableReservePercent: policyReservePercent(policy),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Could not apply the proposed policy change.' }, { status: 400 });
  }
}
