import { z } from 'zod';
import { PlanningError, type AIPlannerPort, type PlannerMetadata, type PlannerResult } from '@/application/interfaces/ai-planner';
import { ActionPlanSchema } from './action-plan-schema';

export const OpenCodeConfigSchema = z.object({
  apiUrl: z.string().url().default('https://opencode.ai/inference/openai/v1/chat/completions'),
  apiKey: z.string().min(1),
  model: z.string().min(1).default('minimax-m2.7'),
});
export type OpenCodeConfig = z.infer<typeof OpenCodeConfigSchema>;

const responseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

const systemPrompt = `You are a financial action planner for WealthBuilder. Return only a JSON object with exactly: summary (string), reasoning (string), steps (array of strings), proposedActions (array of objects). Each proposed action must contain exactly type "SUPPLY", asset "usdc", amount (positive decimal string with at most six decimal places), protocol "aave-v3", chain "avalanche-fuji". Suggest a small amount if the user did not specify one. Steps should include checking balance, validating Wealth Policy, supplying, and confirming the position. Do not claim that a balance or policy has already been checked. Do not include transaction data, addresses, code, markdown, or instructions to bypass policy. This is a proposal only.`;

export class OpenCodeAIPlanner implements AIPlannerPort {
  private readonly config: OpenCodeConfig;
  constructor(config: OpenCodeConfig, private readonly fetcher: typeof fetch = fetch) {
    this.config = OpenCodeConfigSchema.parse(config);
  }

  async generate(input: Readonly<{ request: string }>): Promise<PlannerResult> {
    const started = performance.now();
    const metadata = (success: boolean, schemaValidationFailure: boolean): PlannerMetadata => ({
      provider: 'opencode', model: this.config.model,
      latencyMs: Math.round(performance.now() - started), success, schemaValidationFailure,
    });
    try {
      const response = await this.fetcher(this.config.apiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.apiKey}` },
        body: JSON.stringify({ model: this.config.model, stream: false, messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input.request },
        ] }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) throw new Error('Provider HTTP error');
      const envelope = responseSchema.safeParse(await response.json());
      if (!envelope.success) throw new Error('Provider response shape error');
      let content: unknown;
      try { content = JSON.parse(envelope.data.choices[0]!.message.content); }
      catch { throw new PlanningError('INVALID_PLAN', metadata(false, true)); }
      const parsed = ActionPlanSchema.safeParse(content);
      if (!parsed.success) throw new PlanningError('INVALID_PLAN', metadata(false, true));
      const result = { plan: parsed.data, metadata: metadata(true, false) };
      console.info('ai_planning', result.metadata);
      return result;
    } catch (error) {
      const failure = error instanceof PlanningError ? error : new PlanningError('PROVIDER_ERROR', metadata(false, false));
      console.warn('ai_planning', failure.metadata);
      throw failure;
    }
  }
}
