import type { PersonalWealthPolicy, PolicySettings } from '@/domain';
import type { AIChatContext } from './ai-chat';

/** Dev/runtime state source for the context supplied to the AI chat application flow. */
export interface ChatContextPort {
  load(): Promise<AIChatContext>;
  savePolicy(settings: PolicySettings): Promise<PersonalWealthPolicy>;
}
