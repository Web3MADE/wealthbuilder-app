import type { ChatMessage } from '@/application/interfaces/ai-chat';
import type { ActionPlan } from '@/domain';
import type { PlanExecution, PlanPolicyEvaluation } from '../planning/ExecutionPlan';

export type ChatState = 'empty' | 'typing' | 'response' | 'action' | 'attach' | 'menu';

export type PolicyChangeView = Readonly<{
  type: 'SET_MINIMUM_LIQUID_STABLE_RESERVE';
  minimumLiquidStableReserveBps: number;
  currentMinimumLiquidStableReservePercent: number;
  proposedMinimumLiquidStableReservePercent: number;
  state?: 'applied';
}>;

export type ChatResponseKind = 'conversation' | 'insight' | 'policy-summary';

export type ChatMessageView = ChatMessage &
  Readonly<{
    id: string;
    plan?: ActionPlan;
    evaluations?: readonly PlanPolicyEvaluation[];
    executions?: Readonly<Record<number, PlanExecution>>;
    policyChange?: PolicyChangeView;
    responseKind?: ChatResponseKind;
  }>;

export type ChatModel = Readonly<{ id: string; label: string }>;
