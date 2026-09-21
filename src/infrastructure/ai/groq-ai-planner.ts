import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
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

export const GroqConfigSchema = z.object({
  apiKey: z.string().trim().min(1),
  model: z
    .enum(['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'])
    .default('openai/gpt-oss-120b'),
});
export type GroqConfig = z.infer<typeof GroqConfigSchema>;

/** Vercel AI SDK adapter for the Groq model catalog entry. */
export class GroqAIPlanner implements AIPlannerPort, AIChatPort {
  private readonly config: GroqConfig;

  constructor(config: GroqConfig) {
    this.config = GroqConfigSchema.parse(config);
  }

  async generate(input: Readonly<{ request: string }>): Promise<PlannerResult> {
    const started = performance.now();
    const metadata = this.metadataFactory(started);
    try {
      const { text } = await generateText({
        model: this.model(),
        instructions: plannerSystemPrompt,
        prompt: input.request,
        maxOutputTokens: 1200,
      });
      let parsed: ReturnType<typeof parseActionPlanText> | undefined;
      try {
        parsed = parseActionPlanText(text);
      } catch {
        // The schema error is normalized below.
      }
      if (!parsed?.success) throw new PlanningError('INVALID_PLAN', metadata(false, true));
      const result = { plan: parsed.data, metadata: metadata(true, false) };
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
    const metadata = this.metadataFactory(started);
    const instructions = input.context
      ? `${chatSystemPrompt}\n\n${wealthBuilderContextPrompt(input.context)}`
      : chatSystemPrompt;
    try {
      const { text } = await generateText({
        model: this.model(),
        instructions,
        messages: input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        maxOutputTokens: 1200,
      });
      let parsed: Pick<ChatResult, 'message' | 'plan' | 'policyChange'>;
      try {
        parsed = parseChatText(text);
      } catch {
        throw new PlanningError('INVALID_PLAN', metadata(false, true));
      }
      const result = { ...parsed, metadata: metadata(true, false) };
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

  private model() {
    return createGroq({ apiKey: this.config.apiKey })(this.config.model);
  }

  private metadataFactory(started: number) {
    return (success: boolean, schemaValidationFailure: boolean): PlannerMetadata => ({
      provider: 'groq',
      model: this.config.model,
      endpointFamily: 'ai-sdk',
      latencyMs: Math.round(performance.now() - started),
      success,
      schemaValidationFailure,
    });
  }
}
