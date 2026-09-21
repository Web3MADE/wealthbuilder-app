import { z } from 'zod';
import type {
  AIChatContext,
  ChatResult,
  PolicyChangeProposal,
} from '@/application/interfaces/ai-chat';
import { ActionPlanSchema } from './action-plan-schema';

const chatEnvelopeSchema = z
  .object({
    message: z.string().trim().min(1).max(4000),
    actionPlan: z.unknown().nullable().optional(),
    policyChange: z.unknown().nullable().optional(),
  })
  .strict();

const policyChangeSchema: z.ZodType<PolicyChangeProposal> = z
  .object({
    type: z.literal('SET_MINIMUM_LIQUID_STABLE_RESERVE'),
    minimumLiquidStableReserveBps: z.number().int().min(0).max(10_000),
  })
  .strict();

export const plannerSystemPrompt = `You are a financial action planner for WealthBuilder. Return only a JSON object with exactly summary (string), reasoning (string), steps (array of strings), and proposedActions (array). A proposed action, when appropriate, must contain exactly type "SUPPLY", asset "usdc", amount (positive decimal string with at most six decimal places), protocol "aave-v3", and chain "avalanche-fuji". Use an empty proposedActions array when the user asks for portfolio information, asks for a clarification, requests an amount or strategy that cannot be safely proposed, or conflicts with approved protocols or Wealth Policy. Do not invent portfolio facts, balances, policies, yields, or approvals. Ask for clarification in summary, reasoning, or steps when required. A proposal must be policy-aware and must never suggest bypassing policy. Do not include transaction data, addresses, code, markdown, or instructions to execute. This is a proposal only.`;

export const chatSystemPrompt = `You are WealthBuilder, a careful conversational financial assistant. Return only one JSON object with exactly message (string), actionPlan (object or null), and policyChange (object or null). Use actionPlan when the user asks for a financial action: it must contain summary, reasoning, steps, and proposedActions. Every proposed action may only use type "SUPPLY", a positive decimal amount with at most six decimals, and chain "avalanche-fuji". Asset and protocol must be lowercase identifiers. When the user explicitly requests a minimum liquid stablecoin reserve, including language like "keep 25% liquid", return a policyChange proposal immediately with the requested percentage converted to basis points (25% is 2500); do not ask for confirmation because the application shows the confirmation UI. Its exact shape is {"type":"SET_MINIMUM_LIQUID_STABLE_RESERVE","minimumLiquidStableReserveBps":integer from 0 to 10000}. The application makes every policy decision and applies policy changes only after confirmation; never claim an action is allowed, blocked, completed, or a policy has changed. Use null for fields that do not apply. Use the supplied CURRENT WEALTHBUILDER CONTEXT as the only source for portfolio and policy facts. Do not invent balances, policies, yields, approvals, completed actions, transaction data, addresses, code, markdown, or execution instructions. This is a proposal only.`;

function decimal(value: bigint, decimals: number) {
  const whole = value / 10n ** BigInt(decimals);
  const fraction = (value % 10n ** BigInt(decimals))
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function wealthBuilderContextPrompt(context: AIChatContext): string {
  const totalMicros = context.portfolio.positions.reduce(
    (total, position) => total + position.value.micros,
    0n,
  );
  const snapshot = {
    chain: context.portfolio.chain.id,
    portfolio: {
      totalPortfolioValueUsd: decimal(totalMicros, 6),
      positions: context.portfolio.positions.map((position) => ({
        asset: position.asset.id,
        symbol: position.asset.symbol,
        balance: decimal(position.amount.value, position.amount.decimals),
        estimatedValueUsd: decimal(position.value.micros, 6),
        location: position.location,
        protocol: position.protocolId ?? null,
      })),
    },
    personalWealthPolicy: {
      allowedAssets: context.policy.allowedAssetIds,
      excludedAssets: context.policy.excludedAssetIds,
      allowedProtocols: context.policy.allowedProtocolIds,
      maxTransactionUsd: decimal(context.policy.maxSingleTransactionValue.micros, 6),
      maxAutonomousUsd: decimal(context.policy.autonomy.maxTransactionValue.micros, 6),
      autonomyEnabled: context.policy.autonomy.enabled,
      maxAssetConcentrationPercent: context.policy.maxAssetConcentrationBps / 100,
      minimumLiquidStableReservePercent: context.policy.minimumLiquidStableReserveBps / 100,
    },
    supportedActions: context.supportedActionTypes,
    knownAssets: context.supportedAssets.map((asset) => asset.id),
  };
  return `CURRENT WEALTHBUILDER CONTEXT\n${JSON.stringify(snapshot)}`;
}

export function parseAIJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return JSON.parse(fenced ? fenced[1]! : trimmed);
}

export function normalizeActionPlanCandidate(value: unknown): unknown {
  if (!value || typeof value !== 'object' || !('proposedActions' in value)) return value;
  const plan = value as Record<string, unknown>;
  if (!Array.isArray(plan.proposedActions)) return value;
  return {
    ...plan,
    proposedActions: plan.proposedActions.map((candidate) => {
      if (!candidate || typeof candidate !== 'object') return candidate;
      const action = candidate as Record<string, unknown>;
      const rawProtocol = action.protocol ?? action.protocolId;
      const normalizedProtocol =
        typeof rawProtocol === 'string'
          ? rawProtocol
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')
          : rawProtocol;
      const rawChain = action.chain ?? action.network;
      const normalizedChain =
        typeof rawChain === 'string'
          ? rawChain
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')
          : rawChain;
      const rawAmount = action.amount ?? action.amountUsdc;
      const rawType = action.type ?? action.action;
      return {
        type:
          typeof rawType === 'string' && rawType.toUpperCase() === 'SUPPLY' ? 'SUPPLY' : rawType,
        asset:
          typeof action.asset === 'string'
            ? action.asset.toLowerCase().replace(/\s+/g, '-')
            : action.asset,
        amount:
          typeof rawAmount === 'number' && Number.isFinite(rawAmount)
            ? String(rawAmount)
            : rawAmount,
        protocol: normalizedProtocol === 'aave-v3-fuji' ? 'aave-v3' : normalizedProtocol,
        chain:
          typeof normalizedChain === 'string' && normalizedChain.startsWith('avalanche-fuji')
            ? 'avalanche-fuji'
            : rawChain,
      };
    }),
  };
}

export function parseActionPlanText(text: string) {
  return ActionPlanSchema.safeParse(normalizeActionPlanCandidate(parseAIJson(text)));
}

export function parseChatText(text: string): Pick<ChatResult, 'message' | 'plan' | 'policyChange'> {
  let content: unknown;
  try {
    content = parseAIJson(text);
  } catch {
    const message = text.trim();
    if (!message) throw new Error('AI chat response was empty');
    return { message };
  }
  const envelope = chatEnvelopeSchema.safeParse(content);
  if (!envelope.success) {
    const directPlan = ActionPlanSchema.safeParse(normalizeActionPlanCandidate(content));
    if (directPlan.success) return { message: directPlan.data.summary, plan: directPlan.data };
    throw new Error('AI chat response was not a valid conversation envelope');
  }
  const policyChange =
    envelope.data.policyChange === null || envelope.data.policyChange === undefined
      ? undefined
      : policyChangeSchema.safeParse(envelope.data.policyChange);
  if (policyChange && !policyChange.success) throw new Error('AI chat policy change was invalid');
  if (envelope.data.actionPlan === null || envelope.data.actionPlan === undefined) {
    return {
      message: envelope.data.message,
      ...(policyChange ? { policyChange: policyChange.data } : {}),
    };
  }
  const plan = ActionPlanSchema.safeParse(normalizeActionPlanCandidate(envelope.data.actionPlan));
  if (!plan.success) throw new Error('AI chat action plan was invalid');
  return {
    message: envelope.data.message,
    plan: plan.data,
    ...(policyChange ? { policyChange: policyChange.data } : {}),
  };
}
