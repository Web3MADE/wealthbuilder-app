import { describe, expect, it, vi } from 'vitest';
import { applyChatPolicyChange, evaluateChatPlan } from '@/application/chat-policy-service';
import type { AIChatContext } from '@/application/interfaces/ai-chat';
import { PolicyService } from '@/application/policy-service';
import { atomic, usd } from '@/domain';
import { ActionPlanSchema } from '@/infrastructure/ai/action-plan-schema';
import { DevChatContextStore } from '@/infrastructure/dev/chat-context-store';
import { OpenCodeGoPlanner } from '@/infrastructure/ai/opencode-ai-planner';

const plan = (amount: string, protocol = 'aave-v3', asset = 'usdc') =>
  ActionPlanSchema.parse({
    summary: `Supply ${amount} ${asset.toUpperCase()}`,
    reasoning: 'A proposal for deterministic policy evaluation.',
    steps: ['Check balance', 'Evaluate policy', 'Prepare supply'],
    proposedActions: [{ type: 'SUPPLY', asset, amount, protocol, chain: 'avalanche-fuji' }],
  });

async function context(): Promise<AIChatContext> {
  return new DevChatContextStore().load();
}

describe('chat portfolio and policy context', () => {
  it('passes the supplied domain portfolio and policy snapshot to the AI provider', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    message: 'Your portfolio is diversified.',
                    actionPlan: null,
                    policyChange: null,
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    );
    await new OpenCodeGoPlanner(
      { baseUrl: 'https://example.test/zen/go/v1', apiKey: 'test-key', model: 'gpt-5.6-luna' },
      fetcher,
    ).generateChat({
      messages: [{ role: 'user', content: 'How is my portfolio doing?' }],
      context: await context(),
    });
    const sent = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(sent.instructions).toContain('CURRENT WEALTHBUILDER CONTEXT');
    expect(sent.instructions).toContain('totalPortfolioValueUsd');
    expect(sent.instructions).toContain('minimumLiquidStableReservePercent');
    expect(sent.instructions).toContain('aave-v3');
  });

  it('converts supply plans into domain actions and returns allowed, approval, and blocked decisions', async () => {
    const snapshot = await context();
    const asset = snapshot.supportedAssets[0]!;
    const evaluationSnapshot: AIChatContext = {
      ...snapshot,
      portfolio: {
        ...snapshot.portfolio,
        positions: [
          {
            asset,
            amount: atomic(1_000_000_000n, 6),
            value: usd(1_000_000_000n),
            location: 'WALLET',
          },
          {
            asset: { id: 'avax', symbol: 'AVAX', decimals: 18, isStablecoin: false },
            amount: atomic(1_000_000_000_000_000_000n, 18),
            value: usd(1_000_000_000n),
            location: 'WALLET',
          },
        ],
      },
    };
    const policyService = new PolicyService();
    expect(
      evaluateChatPlan(policyService, evaluationSnapshot, plan('20'))[0]!.decision.outcome,
    ).toBe('AUTONOMOUS_ALLOWED');
    expect(
      evaluateChatPlan(policyService, evaluationSnapshot, plan('500'))[0]!.decision.outcome,
    ).toBe('REQUIRES_APPROVAL');
    expect(
      evaluateChatPlan(policyService, evaluationSnapshot, plan('5000'))[0]!.decision.outcome,
    ).toBe('BLOCKED');
  });

  it('blocks an unapproved protocol through the deterministic policy service', async () => {
    const decision = evaluateChatPlan(
      new PolicyService(),
      await context(),
      plan('20', 'unapproved-protocol'),
    )[0]!.decision;
    expect(decision.outcome).toBe('BLOCKED');
    expect(decision.violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'PROTOCOL_NOT_ALLOWED' })]),
    );
  });

  it('fails unknown assets safely through price and policy violations', async () => {
    const decision = evaluateChatPlan(
      new PolicyService(),
      await context(),
      plan('20', 'unapproved-protocol', 'doge'),
    )[0]!.decision;
    expect(decision.outcome).toBe('BLOCKED');
    expect(decision.violations.map((violation) => violation.code)).toEqual(
      expect.arrayContaining(['PRICE_UNAVAILABLE', 'ASSET_NOT_ALLOWED', 'PROTOCOL_NOT_ALLOWED']),
    );
  });

  it('updates only the in-memory development policy after a confirmed proposal', async () => {
    const store = new DevChatContextStore();
    const before = await store.load();
    const policy = await applyChatPolicyChange(store, before, {
      type: 'SET_MINIMUM_LIQUID_STABLE_RESERVE',
      minimumLiquidStableReserveBps: 2_500,
    });
    const after = await store.load();
    expect(policy.minimumLiquidStableReserveBps).toBe(2_500);
    expect(after.policy.minimumLiquidStableReserveBps).toBe(2_500);
    expect(after.policy.version).toBe(before.policy.version + 1);
  });
});
