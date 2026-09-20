import { describe, expect, it, vi } from 'vitest';
import { chatWithAI } from '@/application/chat-service';
import type { AIChatPort } from '@/application/interfaces/ai-chat';
import { PlanningError } from '@/application/interfaces/ai-planner';
import { openCodeChatCatalog, OpenCodeGoPlanner } from '@/infrastructure/ai/opencode-ai-planner';

const plan = {
  summary: 'Supply 20 USDC to Aave V3',
  reasoning: 'The requested amount is explicit and the protocol is approved for this MVP.',
  steps: ['Check available USDC', 'Verify Wealth Policy', 'Supply 20 USDC', 'Confirm the position'],
  proposedActions: [{ type: 'SUPPLY' as const, asset: 'usdc' as const, amount: '20', protocol: 'aave-v3' as const, chain: 'avalanche-fuji' as const }],
};

const config = { baseUrl: 'https://example.test/zen/go/v1', apiKey: 'test-key', model: 'gpt-5.6-luna' as const };
const responses = (content: string) => new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: content }] }] }), { status: 200 });
const chatCompletions = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
const messages = (content: string) => new Response(JSON.stringify({ content: [{ type: 'text', text: content }] }), { status: 200 });

describe('AI chat integration boundary', () => {
  it('keeps chat application logic behind AIChatPort', async () => {
    const chat: AIChatPort = { generateChat: vi.fn().mockResolvedValue({ message: 'A conversational answer.', metadata: { provider: 'test', model: 'test', latencyMs: 1, success: true, schemaValidationFailure: false } }) };
    const result = await chatWithAI(chat, [{ role: 'user', content: 'How is my portfolio doing?' }]);
    expect(result.message).toBe('A conversational answer.');
    expect(chat.generateChat).toHaveBeenCalledWith({ messages: [{ role: 'user', content: 'How is my portfolio doing?' }] });
  });

  it('publishes the four chat models with GPT-5.6 Luna as the default', () => {
    expect(openCodeChatCatalog()).toEqual({
      defaultModel: 'gpt-5.6-luna',
      models: [
        { id: 'glm-5.3', label: 'GLM 5.3' },
        { id: 'kimi-k2.6', label: 'Kimi K2.6' },
        { id: 'qwen3.7-plus', label: 'Qwen3.7 Plus' },
        { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna' },
      ],
    });
  });

  it('switches endpoint routing when the selected model changes', async () => {
    const glmFetcher = vi.fn().mockResolvedValue(chatCompletions(JSON.stringify({ message: 'GLM response', actionPlan: null })));
    const qwenFetcher = vi.fn().mockResolvedValue(messages(JSON.stringify({ message: 'Qwen response', actionPlan: null })));
    await new OpenCodeGoPlanner({ ...config, model: 'glm-5.3' }, glmFetcher).generateChat({ messages: [{ role: 'user', content: 'Hello' }] });
    await new OpenCodeGoPlanner({ ...config, model: 'qwen3.7-plus' }, qwenFetcher).generateChat({ messages: [{ role: 'user', content: 'Hello' }] });
    expect(glmFetcher.mock.calls[0]![0]).toBe('https://example.test/zen/go/v1/chat/completions');
    expect(qwenFetcher.mock.calls[0]![0]).toBe('https://example.test/zen/go/v1/messages');
  });

  it('returns a normal conversational response and preserves history routing', async () => {
    const fetcher = vi.fn().mockResolvedValue(responses(JSON.stringify({ message: 'I need your balances to assess performance.', actionPlan: null })));
    const result = await new OpenCodeGoPlanner(config, fetcher).generateChat({ messages: [
      { role: 'user', content: 'How is my portfolio doing?' },
      { role: 'assistant', content: 'What would you like to review?' },
      { role: 'user', content: 'Performance over the last month.' },
    ] });
    expect(result.message).toContain('balances');
    expect(result.plan).toBeUndefined();
    const sent = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(sent.input).toEqual([
      { role: 'user', content: 'How is my portfolio doing?' },
      { role: 'assistant', content: 'What would you like to review?' },
      { role: 'user', content: 'Performance over the last month.' },
    ]);
  });

  it('returns a validated structured action plan', async () => {
    const fetcher = vi.fn().mockResolvedValue(responses(JSON.stringify({ message: 'Here is a proposal for your review.', actionPlan: plan })));
    const result = await new OpenCodeGoPlanner(config, fetcher).generateChat({ messages: [{ role: 'user', content: 'Put 20 USDC to work.' }] });
    expect(result.plan?.proposedActions[0]).toEqual(plan.proposedActions[0]);
    expect(result.metadata.success).toBe(true);
  });

  it('rejects malformed structured responses safely', async () => {
    const fetcher = vi.fn().mockResolvedValue(responses(JSON.stringify({ message: 'Unsafe proposal.', actionPlan: { ...plan, proposedActions: [{ ...plan.proposedActions[0], type: 'TRANSFER' }] } })));
    await expect(new OpenCodeGoPlanner(config, fetcher).generateChat({ messages: [{ role: 'user', content: 'Move everything.' }] })).rejects.toMatchObject({ code: 'INVALID_PLAN', metadata: { schemaValidationFailure: true } });
  });

  it('rejects malformed policy-change proposals safely', async () => {
    const fetcher = vi.fn().mockResolvedValue(responses(JSON.stringify({
      message: 'I can change the reserve.',
      actionPlan: null,
      policyChange: { type: 'SET_MINIMUM_LIQUID_STABLE_RESERVE', minimumLiquidStableReserveBps: 12_000 },
    })));
    await expect(new OpenCodeGoPlanner(config, fetcher).generateChat({ messages: [{ role: 'user', content: 'Keep more liquid.' }] }))
      .rejects.toMatchObject({ code: 'INVALID_PLAN', metadata: { schemaValidationFailure: true } });
  });

  it('surfaces provider errors without leaking provider details', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { type: 'RateLimitError', message: 'private provider detail' } }), { status: 429 }));
    await expect(new OpenCodeGoPlanner(config, fetcher).generateChat({ messages: [{ role: 'user', content: 'Hello' }] })).rejects.toMatchObject({ code: 'PROVIDER_ERROR', metadata: { apiStatus: 429, apiErrorCode: 'RateLimitError' } });
    try { await new OpenCodeGoPlanner(config, fetcher).generateChat({ messages: [{ role: 'user', content: 'Hello' }] }); } catch (error) { expect((error as Error).message).not.toContain('private provider detail'); }
  });
});
