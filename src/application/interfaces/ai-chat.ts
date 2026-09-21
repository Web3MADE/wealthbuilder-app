import type { ActionPlan, AssetRef, PersonalWealthPolicy, Portfolio, PriceQuote } from '@/domain';
import type { PlannerMetadata } from './ai-planner';

export type ChatMessage = Readonly<{
  role: 'user' | 'assistant';
  content: string;
}>;

/** A provider-neutral snapshot supplied by the application for one chat turn. */
export type AIChatContext = Readonly<{
  portfolio: Portfolio;
  policy: PersonalWealthPolicy;
  quotes: readonly PriceQuote[];
  supportedAssets: readonly AssetRef[];
  supportedActionTypes: readonly ['SUPPLY'];
}>;

export type PolicyChangeProposal = Readonly<{
  type: 'SET_MINIMUM_LIQUID_STABLE_RESERVE';
  minimumLiquidStableReserveBps: number;
}>;

export type ChatResult = Readonly<{
  message: string;
  plan?: ActionPlan;
  policyChange?: PolicyChangeProposal;
  metadata: PlannerMetadata;
}>;

export interface AIChatPort {
  generateChat(
    input: Readonly<{
      messages: readonly ChatMessage[];
      context?: AIChatContext;
    }>,
  ): Promise<ChatResult>;
}
