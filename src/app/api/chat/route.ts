import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  evaluateChatPlan,
  policyDecisionAmountUsd,
  policyReservePercent,
} from '@/application/chat-policy-service';
import { chatWithAI } from '@/application/chat-service';
import { PlanningError } from '@/application/interfaces/ai-planner';
import { PolicyService } from '@/application/policy-service';
import {
  AIProviderConfigurationError,
  aiChatCatalog,
  defaultChatModelId,
  resolveAIChatModel,
} from '@/infrastructure/ai/ai-model-catalog';
import { devChatExecutionStore } from '@/infrastructure/dev/chat-execution-store';
import { devChatContextStore } from '@/infrastructure/dev/chat-context-store';
import { devActivityStore } from '@/infrastructure/dev/dev-activity-store';

export const runtime = 'nodejs';

const messageSchema = z
  .object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) })
  .strict();
const requestSchema = z
  .object({
    model: z.string().optional(),
    messages: z.array(messageSchema).min(1).max(20),
    smartAccountAddress: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/)
      .optional(),
  })
  .strict();
const contextStore = devChatContextStore();
const executionStore = devChatExecutionStore();
const activityStore = devActivityStore();

function activityReason(code: string) {
  const reasons: Record<string, string> = {
    ASSET_CONCENTRATION_EXCEEDED: 'It would exceed your asset concentration limit.',
    LIQUIDITY_RESERVE_BREACHED: 'It would reduce your liquid reserve below its limit.',
    TRANSACTION_LIMIT_EXCEEDED: 'It is above your transaction limit.',
    PROTOCOL_NOT_ALLOWED: 'The destination is not approved by your Wealth Policy.',
    ASSET_NOT_ALLOWED: 'The asset is not included in your Wealth Policy.',
    ASSET_EXCLUDED: 'The asset is excluded by your Wealth Policy.',
  };
  return reasons[code] ?? 'It does not meet your Wealth Policy.';
}

function actionAmount(action: {
  amount: { value: bigint; decimals: number };
  asset: { symbol: string };
}) {
  const whole = action.amount.value / 10n ** BigInt(action.amount.decimals);
  const fraction = (action.amount.value % 10n ** BigInt(action.amount.decimals))
    .toString()
    .padStart(action.amount.decimals, '0')
    .replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''} ${action.asset.symbol}`;
}

export function GET() {
  return NextResponse.json(aiChatCatalog());
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request.' }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Send a conversation with up to twenty messages.' },
      { status: 400 },
    );
  try {
    const planner = resolveAIChatModel(parsed.data.model ?? defaultChatModelId);
    const context = await contextStore.load(parsed.data.smartAccountAddress);
    const result = await chatWithAI(planner, parsed.data.messages, context);
    const evaluatedActions = result.plan
      ? evaluateChatPlan(new PolicyService(), context, result.plan)
      : [];
    executionStore.register(evaluatedActions);
    for (const { action, decision } of evaluatedActions) {
      const amount = actionAmount(action);
      if (decision.outcome === 'BLOCKED') {
        activityStore.record({
          kind: 'ACTION_BLOCKED',
          title: 'Action blocked by Wealth Policy',
          description: activityReason(decision.violations[0]?.code ?? ''),
          status: 'blocked',
          amount,
        });
      } else {
        activityStore.record({
          kind: 'ACTION_APPROVED',
          title: `Supply ${amount} to Aave`,
          description:
            decision.outcome === 'AUTONOMOUS_ALLOWED'
              ? 'Allowed automatically by your Wealth Policy.'
              : 'Ready for your confirmation.',
          status: 'allowed',
          amount,
        });
      }
    }
    const evaluations = evaluatedActions.map(({ actionIndex, action, decision }) => ({
      actionIndex,
      actionId: action.id,
      outcome: decision.outcome,
      actionValueUsd: policyDecisionAmountUsd(decision),
      reasons: decision.violations,
    }));
    return NextResponse.json({
      message: result.message,
      plan: result.plan ?? null,
      evaluations,
      policyChange: result.policyChange
        ? {
            ...result.policyChange,
            currentMinimumLiquidStableReservePercent: policyReservePercent(context.policy),
            proposedMinimumLiquidStableReservePercent:
              result.policyChange.minimumLiquidStableReserveBps / 100,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof AIProviderConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof PlanningError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'INVALID_PLAN' ? 422 : 502 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create a chat response.' },
      { status: 400 },
    );
  }
}
