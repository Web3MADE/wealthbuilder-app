import { describe, expect, it, vi } from 'vitest';
import { planAction } from '@/application/plan-action-service';
import type { AIPlannerPort } from '@/application/interfaces/ai-planner';
import { PlanningError } from '@/application/interfaces/ai-planner';
import { ActionPlanSchema } from '@/infrastructure/ai/action-plan-schema';
import { OpenCodeAIPlanner } from '@/infrastructure/ai/opencode-ai-planner';

const validPlan = {
  summary: 'Supply a small amount of USDC',
  reasoning: 'Putting idle stablecoins to work may earn yield, subject to balance and policy checks.',
  steps: ['Check available USDC', 'Verify Personal Wealth Policy', 'Supply 10 USDC to Aave V3', 'Confirm resulting position'],
  proposedActions: [{ type: 'SUPPLY', asset: 'usdc', amount: '10', protocol: 'aave-v3', chain: 'avalanche-fuji' }],
};
const config = { apiUrl: 'https://example.test/chat/completions', apiKey: 'test-key', model: 'test-model' };
const response = (content: unknown) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 });

describe('AI action planning boundary', () => {
  it('accepts a valid normalized plan and can use any AIPlannerPort implementation', async () => {
    const plan = ActionPlanSchema.parse(validPlan);
    const fakePort: AIPlannerPort = { generate: vi.fn().mockResolvedValue({ plan, metadata: { provider: 'other', model: 'test', latencyMs: 1, success: true, schemaValidationFailure: false } }) };
    const result = await planAction(fakePort, '  Put idle USDC to work.  ');
    expect(fakePort.generate).toHaveBeenCalledWith({ request: 'Put idle USDC to work.' });
    expect(result.plan.proposedActions[0]?.amount).toBe('10');
  });

  it('rejects malformed and unsupported model actions', () => {
    expect(ActionPlanSchema.safeParse({ ...validPlan, steps: [] }).success).toBe(false);
    expect(ActionPlanSchema.safeParse({ ...validPlan, proposedActions: [{ ...validPlan.proposedActions[0], type: 'TRANSFER' }] }).success).toBe(false);
    expect(ActionPlanSchema.safeParse({ ...validPlan, proposedActions: [{ ...validPlan.proposedActions[0], amount: '-10' }] }).success).toBe(false);
    expect(ActionPlanSchema.safeParse({ ...validPlan, proposedActions: [{ ...validPlan.proposedActions[0], chain: 'avalanche-mainnet' }] }).success).toBe(false);
  });

  it('converts an OpenCode chat response into a validated plan and metadata', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const fetcher = vi.fn().mockResolvedValue(response(validPlan));
    const result = await new OpenCodeAIPlanner(config, fetcher).generate({ request: 'Put idle USDC to work.' });
    expect(result.plan.proposedActions[0]).toEqual(validPlan.proposedActions[0]);
    expect(result.metadata).toMatchObject({ provider: 'opencode', model: 'test-model', success: true, schemaValidationFailure: false });
    const sent = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(sent.messages[1]).toEqual({ role: 'user', content: 'Put idle USDC to work.' });
    expect(sent).not.toHaveProperty('tools');
    vi.restoreAllMocks();
  });

  it('rejects invalid provider output with schema failure metadata', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = vi.fn().mockResolvedValue(response({ ...validPlan, proposedActions: [{ ...validPlan.proposedActions[0], type: 'TRANSFER' }] }));
    const planner = new OpenCodeAIPlanner(config, fetcher);
    await expect(planner.generate({ request: 'Move funds' })).rejects.toMatchObject({ code: 'INVALID_PLAN', metadata: { success: false, schemaValidationFailure: true } });
    expect(fetcher).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });

  it('surfaces provider errors without returning the provider response or API key', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const planner = new OpenCodeAIPlanner(config, vi.fn().mockResolvedValue(new Response('secret provider detail', { status: 503 })));
    try { await planner.generate({ request: 'Put USDC to work' }); throw new Error('Expected failure'); }
    catch (error) {
      expect(error).toBeInstanceOf(PlanningError);
      expect((error as PlanningError).code).toBe('PROVIDER_ERROR');
      expect((error as Error).message).not.toContain('secret');
      expect((error as Error).message).not.toContain(config.apiKey);
    }
    vi.restoreAllMocks();
  });
});
