import { describe, expect, it, vi } from 'vitest';
import { planAction } from '@/application/plan-action-service';
import type { AIPlannerPort } from '@/application/interfaces/ai-planner';
import { PlanningError } from '@/application/interfaces/ai-planner';
import { ActionPlanSchema } from '@/infrastructure/ai/action-plan-schema';
import {
  OpenCodeAIPlanner,
  openCodeCatalog,
  type OpenCodeModel,
} from '@/infrastructure/ai/opencode-ai-planner';

const validPlan = {
  summary: 'Supply a small amount of USDC',
  reasoning:
    'Putting idle stablecoins to work may earn yield, subject to balance and policy checks.',
  steps: [
    'Check available USDC',
    'Verify Personal Wealth Policy',
    'Supply 10 USDC to Aave V3',
    'Confirm resulting position',
  ],
  proposedActions: [
    { type: 'SUPPLY', asset: 'usdc', amount: '10', protocol: 'aave-v3', chain: 'avalanche-fuji' },
  ],
};
const config = {
  baseUrl: 'https://example.test/zen/go/v1',
  apiKey: 'test-key',
  model: 'deepseek-v4-pro' as const,
};
const response = (content: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), {
    status: 200,
  });
const responsesResponse = (content: unknown) =>
  new Response(
    JSON.stringify({
      output: [
        { type: 'reasoning' },
        { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(content) }] },
      ],
    }),
    { status: 200 },
  );
const messagesResponse = (content: unknown) =>
  new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(content) }] }), {
    status: 200,
  });

describe('AI action planning boundary', () => {
  it('accepts a valid normalized plan and can use any AIPlannerPort implementation', async () => {
    const plan = ActionPlanSchema.parse(validPlan);
    const fakePort: AIPlannerPort = {
      generate: vi.fn().mockResolvedValue({
        plan,
        metadata: {
          provider: 'other',
          model: 'test',
          latencyMs: 1,
          success: true,
          schemaValidationFailure: false,
        },
      }),
    };
    const result = await planAction(fakePort, '  Put idle USDC to work.  ');
    expect(fakePort.generate).toHaveBeenCalledWith({ request: 'Put idle USDC to work.' });
    expect(result.plan.proposedActions[0]?.amount).toBe('10');
  });

  it('rejects malformed and unsupported model actions', () => {
    expect(ActionPlanSchema.safeParse({ ...validPlan, steps: [] }).success).toBe(false);
    expect(
      ActionPlanSchema.safeParse({
        ...validPlan,
        proposedActions: [{ ...validPlan.proposedActions[0], type: 'TRANSFER' }],
      }).success,
    ).toBe(false);
    expect(
      ActionPlanSchema.safeParse({
        ...validPlan,
        proposedActions: [{ ...validPlan.proposedActions[0], amount: '-10' }],
      }).success,
    ).toBe(false);
    expect(
      ActionPlanSchema.safeParse({
        ...validPlan,
        proposedActions: [{ ...validPlan.proposedActions[0], chain: 'avalanche-mainnet' }],
      }).success,
    ).toBe(false);
    expect(ActionPlanSchema.safeParse({ ...validPlan, proposedActions: [] }).success).toBe(true);
  });

  it.each([
    ['deepseek-v4-pro', 'chat/completions', 'chat-completions'],
    ['glm-5.3', 'chat/completions', 'chat-completions'],
    ['kimi-k2.6', 'chat/completions', 'chat-completions'],
    ['qwen3.7-plus', 'messages', 'messages'],
    ['gpt-5.6-luna', 'responses', 'responses'],
  ] as const)('routes %s to Go %s and validates the plan', async (model, endpoint, family) => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        endpoint === 'responses'
          ? responsesResponse(validPlan)
          : endpoint === 'messages'
            ? messagesResponse(validPlan)
            : response(validPlan),
      );
    const result = await new OpenCodeAIPlanner(
      { ...config, model: model as OpenCodeModel },
      fetcher,
    ).generate({ request: 'Put idle USDC to work.' });
    expect(result.plan.proposedActions[0]).toEqual(validPlan.proposedActions[0]);
    expect(result.metadata).toMatchObject({
      provider: 'opencode-go',
      model,
      endpointFamily: family,
      success: true,
      schemaValidationFailure: false,
      apiStatus: 200,
    });
    expect(fetcher.mock.calls[0]![0]).toBe(`https://example.test/zen/go/v1/${endpoint}`);
    const sent = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(fetcher.mock.calls[0]![1].headers.authorization).toBe('Bearer test-key');
    expect(fetcher.mock.calls[0]![1].headers['x-opencode-session']).toMatch(/^wb_/);
    if (endpoint === 'messages')
      expect(fetcher.mock.calls[0]![1].headers['x-api-key']).toBe('test-key');
    if (endpoint === 'responses') expect(sent.input).toBe('Put idle USDC to work.');
    else if (endpoint === 'messages')
      expect(sent.messages[0]).toEqual({ role: 'user', content: 'Put idle USDC to work.' });
    else expect(sent.messages[1]).toEqual({ role: 'user', content: 'Put idle USDC to work.' });
    expect(sent).not.toHaveProperty('tools');
    vi.restoreAllMocks();
  });

  it('publishes exactly the five selectable model configurations', () => {
    expect(openCodeCatalog().models.map((model) => model.id)).toEqual([
      'deepseek-v4-pro',
      'glm-5.3',
      'kimi-k2.6',
      'qwen3.7-plus',
      'gpt-5.6-luna',
    ]);
  });

  it('rejects invalid provider output with schema failure metadata', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = vi.fn().mockResolvedValue(
      response({
        ...validPlan,
        proposedActions: [{ ...validPlan.proposedActions[0], type: 'TRANSFER' }],
      }),
    );
    const planner = new OpenCodeAIPlanner(config, fetcher);
    await expect(planner.generate({ request: 'Move funds' })).rejects.toMatchObject({
      code: 'INVALID_PLAN',
      metadata: { success: false, schemaValidationFailure: true },
    });
    expect(fetcher).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });

  it('surfaces provider errors without returning the provider response or API key', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const planner = new OpenCodeAIPlanner(
      config,
      vi.fn().mockResolvedValue(new Response('secret provider detail', { status: 503 })),
    );
    try {
      await planner.generate({ request: 'Put USDC to work' });
      throw new Error('Expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(PlanningError);
      expect((error as PlanningError).code).toBe('PROVIDER_ERROR');
      expect((error as PlanningError).metadata.apiStatus).toBe(503);
      expect((error as Error).message).not.toContain('secret');
      expect((error as Error).message).not.toContain(config.apiKey);
    }
    vi.restoreAllMocks();
  });

  it('reports a safe Go API error code without exposing its message', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const body = {
      type: 'error',
      error: { type: 'CreditsError', message: 'Insufficient balance at a private billing URL' },
    };
    const planner = new OpenCodeAIPlanner(
      config,
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 401 })),
    );
    await expect(planner.generate({ request: 'Put USDC to work' })).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
      metadata: { apiStatus: 401, apiErrorCode: 'CreditsError', schemaValidationFailure: false },
    });
    vi.restoreAllMocks();
  });
});
