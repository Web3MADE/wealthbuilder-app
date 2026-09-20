import type { ActionPlan } from '@/domain';
import type { PlannerMetadata } from './ai-planner';

export type ChatMessage = Readonly<{
  role: 'user' | 'assistant';
  content: string;
}>;

export type ChatResult = Readonly<{
  message: string;
  plan?: ActionPlan;
  metadata: PlannerMetadata;
}>;

export interface AIChatPort {
  generateChat(input: Readonly<{ messages: readonly ChatMessage[] }>): Promise<ChatResult>;
}
