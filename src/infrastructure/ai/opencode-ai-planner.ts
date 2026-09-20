import { z } from 'zod';
import { PlanningError, type AIPlannerPort, type PlannerMetadata, type PlannerResult } from '@/application/interfaces/ai-planner';
import type { AIChatPort, ChatMessage, ChatResult } from '@/application/interfaces/ai-chat';
import { ActionPlanSchema } from './action-plan-schema';

export const OpenCodeModelSchema = z.enum([
  'deepseek-v4-pro', 'glm-5.3', 'kimi-k2.6', 'qwen3.7-plus', 'gpt-5.6-luna',
]);
export type OpenCodeModel = z.infer<typeof OpenCodeModelSchema>;

type EndpointFamily = 'chat-completions' | 'messages' | 'responses';
const models: readonly { id: OpenCodeModel; label: string; endpoint: EndpointFamily }[] = [
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', endpoint: 'chat-completions' },
  { id: 'glm-5.3', label: 'GLM 5.3', endpoint: 'chat-completions' },
  { id: 'kimi-k2.6', label: 'Kimi K2.6', endpoint: 'chat-completions' },
  { id: 'qwen3.7-plus', label: 'Qwen3.7 Plus', endpoint: 'messages' },
  { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', endpoint: 'responses' },
];

export function openCodeCatalog(preferredModel?: string) {
  const selected = OpenCodeModelSchema.safeParse(preferredModel);
  return {
    defaultModel: selected.success ? selected.data : OpenCodeModelSchema.parse('deepseek-v4-pro'),
    models: models.map(({ id, label }) => ({ id, label })),
  };
}

export function openCodeChatCatalog() {
  return {
    defaultModel: 'gpt-5.6-luna' as const,
    models: models.filter(({ id }) => id !== 'deepseek-v4-pro').map(({ id, label }) => ({ id, label })),
  };
}

export const OpenCodeConfigSchema = z.object({
  baseUrl: z.string().url().default('https://opencode.ai/zen/go/v1'),
  apiKey: z.string().trim().min(1),
  model: OpenCodeModelSchema.default('deepseek-v4-pro'),
});
export type OpenCodeConfig = z.infer<typeof OpenCodeConfigSchema>;

const chatResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});
const responsesResponseSchema = z.object({
  output_text: z.string().optional(),
  output: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
  })).optional(),
});
const messagesResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })).min(1),
});

const chatEnvelopeSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  actionPlan: z.unknown().nullable().optional(),
}).strict();

const systemPrompt = `You are a financial action planner for WealthBuilder. Return only a JSON object with exactly summary (string), reasoning (string), steps (array of strings), and proposedActions (array). A proposed action, when appropriate, must contain exactly type "SUPPLY", asset "usdc", amount (positive decimal string with at most six decimal places), protocol "aave-v3", and chain "avalanche-fuji". Use an empty proposedActions array when the user asks for portfolio information, asks for a clarification, requests an amount or strategy that cannot be safely proposed, or conflicts with approved protocols or Wealth Policy. Do not invent portfolio facts, balances, policies, yields, or approvals. Ask for clarification in summary, reasoning, or steps when required. A proposal must be policy-aware and must never suggest bypassing policy. Do not include transaction data, addresses, code, markdown, or instructions to execute. This is a proposal only.`;
const chatSystemPrompt = `You are WealthBuilder, a careful conversational financial assistant. Return only a JSON object with exactly message (string) and actionPlan (object or null). Use actionPlan when the user asks for a specific financial action that can be represented safely; it must contain summary, reasoning, steps, and proposedActions. Proposed actions currently support only SUPPLY usdc to aave-v3 on avalanche-fuji with a positive decimal amount. Use null for informational responses, clarifying questions, policy conflicts, or requests that lack enough verified information. Do not invent portfolio facts, balances, policies, yields, approvals, or completed actions. Do not include transaction data, addresses, code, markdown, or execution instructions. This is a proposal only.`;

function responseText(payload: unknown, endpoint: EndpointFamily): string {
  if (endpoint === 'chat-completions') {
    const parsed = chatResponseSchema.safeParse(payload);
    if (!parsed.success) throw new Error('OpenCode chat response shape error');
    return parsed.data.choices[0]!.message.content;
  }
  if (endpoint === 'messages') {
    const parsed = messagesResponseSchema.safeParse(payload);
    if (!parsed.success) throw new Error('OpenCode Messages response shape error');
    return parsed.data.content.filter((part) => part.type === 'text').map((part) => part.text ?? '').join('');
  }
  const parsed = responsesResponseSchema.safeParse(payload);
  if (!parsed.success) throw new Error('OpenCode Responses shape error');
  if (parsed.data.output_text) return parsed.data.output_text;
  const parts = parsed.data.output?.flatMap((item) =>
    item.type === 'message' ? (item.content ?? []).filter((part) => part.type === 'output_text').map((part) => part.text ?? '') : [],
  ) ?? [];
  if (!parts.length) throw new Error('OpenCode Responses text missing');
  return parts.join('');
}

function parsePlanText(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return JSON.parse(fenced ? fenced[1]! : trimmed);
}

function normalizeActionPlanCandidate(value: unknown): unknown {
  if (!value || typeof value !== 'object' || !('proposedActions' in value) || !Array.isArray(value.proposedActions)) return value;
  const plan = value as Record<string, unknown>;
  const proposedActions = plan.proposedActions as unknown[];
  return {
    ...plan,
    proposedActions: proposedActions.map((candidate) => {
      if (!candidate || typeof candidate !== 'object') return candidate;
      const action = candidate as Record<string, unknown>;
      const asset = typeof action.asset === 'string' && action.asset.toLowerCase() === 'usdc' ? 'usdc' : action.asset;
      const protocol = typeof action.protocol === 'string' && action.protocol.toLowerCase().replace(/\s+/g, '-') === 'aave-v3' ? 'aave-v3' : action.protocol;
      const chainValue = action.chain ?? action.network;
      const chain = typeof chainValue === 'string' && chainValue.toLowerCase().replace(/\s+/g, '-') === 'avalanche-fuji' ? 'avalanche-fuji' : chainValue;
      const typeValue = action.type ?? action.action;
      const type = typeof typeValue === 'string' && typeValue.toUpperCase() === 'SUPPLY' ? 'SUPPLY' : typeValue;
      return { type, asset, amount: action.amount, protocol, chain };
    }),
  };
}

function parseChatText(text: string): Pick<ChatResult, 'message' | 'plan'> {
  let content: unknown;
  try {
    content = parsePlanText(text);
  } catch {
    const message = text.trim();
    if (!message) throw new Error('OpenCode chat response was empty');
    return { message };
  }
  const envelope = chatEnvelopeSchema.safeParse(content);
  if (envelope.success) {
    if (envelope.data.actionPlan === null || envelope.data.actionPlan === undefined) return { message: envelope.data.message };
    const plan = ActionPlanSchema.safeParse(normalizeActionPlanCandidate(envelope.data.actionPlan));
    if (!plan.success) throw new Error('OpenCode chat action plan was invalid');
    return { message: envelope.data.message, plan: plan.data };
  }
  const directPlan = ActionPlanSchema.safeParse(normalizeActionPlanCandidate(content));
  if (directPlan.success) return { message: directPlan.data.summary, plan: directPlan.data };
  throw new Error('OpenCode chat response was not a valid conversation envelope');
}

async function requestProviderText(
  fetcher: typeof fetch,
  config: OpenCodeConfig,
  endpoint: EndpointFamily,
  body: unknown,
  metadata: (success: boolean, schemaValidationFailure: boolean, apiStatus?: number, apiErrorCode?: string) => PlannerMetadata,
): Promise<{ text: string; status: number }> {
  const path = endpoint === 'chat-completions' ? 'chat/completions' : endpoint;
  const url = `${config.baseUrl.replace(/\/$/, '')}/${path}`;
  const response = await fetcher(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
      'x-opencode-session': `wb_${crypto.randomUUID()}`,
      ...(endpoint === 'messages' ? { 'x-api-key': config.apiKey } : {}),
    },
    body: JSON.stringify(body), signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    let apiErrorCode: string | undefined;
    try {
      const payload = await response.json();
      const candidate = payload?.error?.type ?? payload?.error?.code;
      if (typeof candidate === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(candidate)) apiErrorCode = candidate;
    } catch { /* An HTTP status is still available. */ }
    throw new PlanningError('PROVIDER_ERROR', metadata(false, false, response.status, apiErrorCode));
  }
  try {
    return { text: responseText(await response.json(), endpoint), status: response.status };
  } catch {
    throw new PlanningError('PROVIDER_ERROR', metadata(false, false, response.status));
  }
}

export class OpenCodeGoPlanner implements AIPlannerPort, AIChatPort {
  private readonly config: OpenCodeConfig;
  constructor(config: OpenCodeConfig, private readonly fetcher: typeof fetch = fetch) {
    this.config = OpenCodeConfigSchema.parse(config);
  }

  async generate(input: Readonly<{ request: string }>): Promise<PlannerResult> {
    const started = performance.now();
    const { endpoint } = models.find((candidate) => candidate.id === this.config.model)!;
    const metadata = (success: boolean, schemaValidationFailure: boolean, apiStatus?: number, apiErrorCode?: string): PlannerMetadata => ({
      provider: 'opencode-go', model: this.config.model, endpointFamily: endpoint,
      latencyMs: Math.round(performance.now() - started), success, schemaValidationFailure,
      ...(apiStatus === undefined ? {} : { apiStatus }),
      ...(apiErrorCode === undefined ? {} : { apiErrorCode }),
    });
    const body = endpoint === 'chat-completions'
      ? { model: this.config.model, stream: false, messages: [
        { role: 'system', content: systemPrompt }, { role: 'user', content: input.request },
      ] }
      : endpoint === 'messages'
        ? { model: this.config.model, max_tokens: 1200, system: systemPrompt, messages: [{ role: 'user', content: input.request }] }
        : { model: this.config.model, stream: false, instructions: systemPrompt, input: input.request };
    try {
      const { text, status } = await requestProviderText(this.fetcher, this.config, endpoint, body, metadata);
      let content: unknown;
      try { content = parsePlanText(text); }
      catch { throw new PlanningError('INVALID_PLAN', metadata(false, true, status)); }
      const parsed = ActionPlanSchema.safeParse(content);
      if (!parsed.success) throw new PlanningError('INVALID_PLAN', metadata(false, true, status));
      const result = { plan: parsed.data, metadata: metadata(true, false, status) };
      console.info('ai_planning', result.metadata);
      return result;
    } catch (error) {
      const failure = error instanceof PlanningError ? error : new PlanningError('PROVIDER_ERROR', metadata(false, false));
      console.warn('ai_planning', failure.metadata);
      throw failure;
    }
  }

  async generateChat(input: Readonly<{ messages: readonly ChatMessage[] }>): Promise<ChatResult> {
    const started = performance.now();
    const { endpoint } = models.find((candidate) => candidate.id === this.config.model)!;
    const metadata = (success: boolean, schemaValidationFailure: boolean, apiStatus?: number, apiErrorCode?: string): PlannerMetadata => ({
      provider: 'opencode-go', model: this.config.model, endpointFamily: endpoint,
      latencyMs: Math.round(performance.now() - started), success, schemaValidationFailure,
      ...(apiStatus === undefined ? {} : { apiStatus }),
      ...(apiErrorCode === undefined ? {} : { apiErrorCode }),
    });
    const messages = input.messages.map((message) => ({ role: message.role, content: message.content }));
    const body = endpoint === 'chat-completions'
      ? { model: this.config.model, stream: false, messages: [{ role: 'system', content: chatSystemPrompt }, ...messages] }
      : endpoint === 'messages'
        ? { model: this.config.model, max_tokens: 1200, system: chatSystemPrompt, messages }
        : { model: this.config.model, stream: false, instructions: chatSystemPrompt, input: messages };
    try {
      let parsed: Pick<ChatResult, 'message' | 'plan'>;
      const { text, status } = await requestProviderText(this.fetcher, this.config, endpoint, body, metadata);
      try { parsed = parseChatText(text); }
      catch { throw new PlanningError('INVALID_PLAN', metadata(false, true, status)); }
      const result = { ...parsed, metadata: metadata(true, false, status) };
      console.info('ai_chat', result.metadata);
      return result;
    } catch (error) {
      const failure = error instanceof PlanningError ? error : new PlanningError('PROVIDER_ERROR', metadata(false, false));
      console.warn('ai_chat', failure.metadata);
      throw failure;
    }
  }
}

/** Compatibility name for callers that imported the pre-Go adapter. */
export const OpenCodeAIPlanner = OpenCodeGoPlanner;
