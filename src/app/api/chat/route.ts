import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateChatPlan, policyDecisionAmountUsd, policyReservePercent } from '@/application/chat-policy-service';
import { chatWithAI } from '@/application/chat-service';
import { PlanningError } from '@/application/interfaces/ai-planner';
import { PolicyService } from '@/application/policy-service';
import { OpenCodeConfigSchema, OpenCodeGoPlanner, OpenCodeModelSchema, openCodeChatCatalog } from '@/infrastructure/ai/opencode-ai-planner';
import { devChatExecutionStore } from '@/infrastructure/dev/chat-execution-store';
import { devChatContextStore } from '@/infrastructure/dev/chat-context-store';

export const runtime = 'nodejs';

const messageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) }).strict();
const requestSchema = z.object({ model: z.string().optional(), messages: z.array(messageSchema).min(1).max(20) }).strict();
const contextStore = devChatContextStore();
const executionStore = devChatExecutionStore();

export function GET() {
  return NextResponse.json(openCodeChatCatalog());
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON request.' }, { status: 400 }); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Send a conversation with up to twenty messages.' }, { status: 400 });
  const selectedModel = OpenCodeModelSchema.safeParse(parsed.data.model ?? 'gpt-5.6-luna');
  if (!selectedModel.success || selectedModel.data === 'deepseek-v4-pro') return NextResponse.json({ error: 'Select one of the available OpenCode Go chat models.' }, { status: 400 });
  const config = OpenCodeConfigSchema.safeParse({
    baseUrl: process.env.OPENCODE_GO_BASE_URL || undefined,
    apiKey: process.env.OPENCODE_API_KEY,
    model: selectedModel.data,
  });
  if (!config.success) return NextResponse.json({ error: 'OpenCode is not configured. Set OPENCODE_API_KEY.' }, { status: 503 });
  try {
    const context = await contextStore.load();
    const result = await chatWithAI(new OpenCodeGoPlanner(config.data), parsed.data.messages, context);
    const evaluatedActions = result.plan
      ? evaluateChatPlan(new PolicyService(), context, result.plan)
      : [];
    executionStore.register(evaluatedActions);
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
    if (error instanceof PlanningError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === 'INVALID_PLAN' ? 422 : 502 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create a chat response.' }, { status: 400 });
  }
}
