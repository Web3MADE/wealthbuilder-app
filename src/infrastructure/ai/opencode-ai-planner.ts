import { z } from 'zod';
import {
  PlanningError,
  type AIPlannerPort,
  type PlannerMetadata,
  type PlannerResult,
} from '@/application/interfaces/ai-planner';
import type {
  AIChatContext,
  AIChatPort,
  ChatMessage,
  ChatResult,
} from '@/application/interfaces/ai-chat';
import {
  chatSystemPrompt,
  parseActionPlanText,
  parseChatText,
  plannerSystemPrompt,
  wealthBuilderContextPrompt,
} from './wealthbuilder-ai-contract';

export const OpenCodeModelSchema = z.enum([
  'deepseek-v4-pro',
  'glm-5.3',
  'kimi-k2.6',
  'qwen3.7-plus',
  'gpt-5.6-luna',
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

/** Legacy OpenCode-only selector retained for the development planning route. */
export function openCodeChatCatalog() {
  return {
    defaultModel: 'gpt-5.6-luna' as const,
    models: models
      .filter(({ id }) => id !== 'deepseek-v4-pro')
      .map(({ id, label }) => ({ id, label })),
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
  output: z
    .array(
      z.object({
        type: z.string(),
        content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
      }),
    )
    .optional(),
});
const messagesResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })).min(1),
});

function responseText(payload: unknown, endpoint: EndpointFamily): string {
  if (endpoint === 'chat-completions') {
    const parsed = chatResponseSchema.safeParse(payload);
    if (!parsed.success) throw new Error('OpenCode chat response shape error');
    return parsed.data.choices[0]!.message.content;
  }
  if (endpoint === 'messages') {
    const parsed = messagesResponseSchema.safeParse(payload);
    if (!parsed.success) throw new Error('OpenCode Messages response shape error');
    return parsed.data.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text ?? '')
      .join('');
  }
  const parsed = responsesResponseSchema.safeParse(payload);
  if (!parsed.success) throw new Error('OpenCode Responses shape error');
  if (parsed.data.output_text) return parsed.data.output_text;
  const parts =
    parsed.data.output?.flatMap((item) =>
      item.type === 'message'
        ? (item.content ?? [])
            .filter((part) => part.type === 'output_text')
            .map((part) => part.text ?? '')
        : [],
    ) ?? [];
  if (!parts.length) throw new Error('OpenCode Responses text missing');
  return parts.join('');
}

async function requestProviderText(
  fetcher: typeof fetch,
  config: OpenCodeConfig,
  endpoint: EndpointFamily,
  body: unknown,
  metadata: (
    success: boolean,
    schemaValidationFailure: boolean,
    apiStatus?: number,
    apiErrorCode?: string,
  ) => PlannerMetadata,
): Promise<{ text: string; status: number }> {
  const path = endpoint === 'chat-completions' ? 'chat/completions' : endpoint;
  const response = await fetcher(`${config.baseUrl.replace(/\/$/, '')}/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
      'x-opencode-session': `wb_${crypto.randomUUID()}`,
      ...(endpoint === 'messages' ? { 'x-api-key': config.apiKey } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    let apiErrorCode: string | undefined;
    try {
      const payload = await response.json();
      const candidate = payload?.error?.type ?? payload?.error?.code;
      if (typeof candidate === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(candidate)) {
        apiErrorCode = candidate;
      }
    } catch {
      // The HTTP status remains available.
    }
    throw new PlanningError(
      'PROVIDER_ERROR',
      metadata(false, false, response.status, apiErrorCode),
    );
  }
  try {
    return { text: responseText(await response.json(), endpoint), status: response.status };
  } catch {
    throw new PlanningError('PROVIDER_ERROR', metadata(false, false, response.status));
  }
}

export class OpenCodeGoPlanner implements AIPlannerPort, AIChatPort {
  private readonly config: OpenCodeConfig;

  constructor(
    config: OpenCodeConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.config = OpenCodeConfigSchema.parse(config);
  }

  async generate(input: Readonly<{ request: string }>): Promise<PlannerResult> {
    const started = performance.now();
    const { endpoint } = models.find((candidate) => candidate.id === this.config.model)!;
    const metadata = this.metadataFactory(started, endpoint);
    const body = this.requestBody(endpoint, plannerSystemPrompt, input.request);
    try {
      const { text, status } = await requestProviderText(
        this.fetcher,
        this.config,
        endpoint,
        body,
        metadata,
      );
      let parsed: ReturnType<typeof parseActionPlanText> | undefined;
      try {
        parsed = parseActionPlanText(text);
      } catch {
        // The normalized schema failure is returned below.
      }
      if (!parsed?.success) throw new PlanningError('INVALID_PLAN', metadata(false, true, status));
      const result = { plan: parsed.data, metadata: metadata(true, false, status) };
      console.info('ai_planning', result.metadata);
      return result;
    } catch (error) {
      const failure =
        error instanceof PlanningError
          ? error
          : new PlanningError('PROVIDER_ERROR', metadata(false, false));
      console.warn('ai_planning', failure.metadata);
      throw failure;
    }
  }

  async generateChat(
    input: Readonly<{ messages: readonly ChatMessage[]; context?: AIChatContext }>,
  ): Promise<ChatResult> {
    const started = performance.now();
    const { endpoint } = models.find((candidate) => candidate.id === this.config.model)!;
    const metadata = this.metadataFactory(started, endpoint);
    const instructions = input.context
      ? `${chatSystemPrompt}\n\n${wealthBuilderContextPrompt(input.context)}`
      : chatSystemPrompt;
    const body = this.requestBody(endpoint, instructions, input.messages);
    try {
      const { text, status } = await requestProviderText(
        this.fetcher,
        this.config,
        endpoint,
        body,
        metadata,
      );
      let parsed: Pick<ChatResult, 'message' | 'plan' | 'policyChange'>;
      try {
        parsed = parseChatText(text);
      } catch {
        throw new PlanningError('INVALID_PLAN', metadata(false, true, status));
      }
      const result = { ...parsed, metadata: metadata(true, false, status) };
      console.info('ai_chat', result.metadata);
      return result;
    } catch (error) {
      const failure =
        error instanceof PlanningError
          ? error
          : new PlanningError('PROVIDER_ERROR', metadata(false, false));
      console.warn('ai_chat', failure.metadata);
      throw failure;
    }
  }

  private metadataFactory(started: number, endpoint: EndpointFamily) {
    return (
      success: boolean,
      schemaValidationFailure: boolean,
      apiStatus?: number,
      apiErrorCode?: string,
    ): PlannerMetadata => ({
      provider: 'opencode-go',
      model: this.config.model,
      endpointFamily: endpoint,
      latencyMs: Math.round(performance.now() - started),
      success,
      schemaValidationFailure,
      ...(apiStatus === undefined ? {} : { apiStatus }),
      ...(apiErrorCode === undefined ? {} : { apiErrorCode }),
    });
  }

  private requestBody(
    endpoint: EndpointFamily,
    instructions: string,
    input: string | readonly ChatMessage[],
  ) {
    const messages = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
    if (endpoint === 'chat-completions')
      return {
        model: this.config.model,
        stream: false,
        messages: [{ role: 'system', content: instructions }, ...messages],
      };
    if (endpoint === 'messages')
      return { model: this.config.model, max_tokens: 1200, system: instructions, messages };
    return {
      model: this.config.model,
      stream: false,
      instructions,
      input: typeof input === 'string' ? input : messages,
    };
  }
}

/** Compatibility name for callers that imported the pre-Go adapter. */
export const OpenCodeAIPlanner = OpenCodeGoPlanner;
