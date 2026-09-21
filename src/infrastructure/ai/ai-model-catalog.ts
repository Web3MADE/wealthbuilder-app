import type { AIChatPort } from '@/application/interfaces/ai-chat';
import { GroqAIPlanner, GroqConfigSchema, type GroqConfig } from './groq-ai-planner';

export type AIChatModel = Readonly<{
  id: string;
  label: string;
  providerModelId: GroqConfig['model'];
}>;

const chatModels: readonly AIChatModel[] = [
  {
    id: 'groq-gpt-oss-120b',
    label: 'GPT-OSS 120B',
    providerModelId: 'openai/gpt-oss-120b',
  },
  {
    id: 'groq-gpt-oss-20b',
    label: 'GPT-OSS 20B',
    providerModelId: 'openai/gpt-oss-20b',
  },
  {
    id: 'groq-qwen3-8-27b',
    label: 'Qwen3.8 27B',
    providerModelId: 'qwen/qwen3.8-27b',
  },
];

export const defaultChatModelId = 'groq-gpt-oss-120b';

export function aiChatCatalog() {
  return {
    defaultModel: defaultChatModelId,
    models: chatModels.map(({ id, label }) => ({ id, label })),
  };
}

export class AIProviderConfigurationError extends Error {}

export function resolveAIChatModel(modelId: string): AIChatPort {
  const selected = chatModels.find((model) => model.id === modelId);
  if (!selected) throw new AIProviderConfigurationError('Select the available AI model.');
  const config = GroqConfigSchema.safeParse({
    apiKey: process.env.GROQ_API_KEY,
    model: selected.providerModelId,
  });
  if (!config.success)
    throw new AIProviderConfigurationError('Groq is not configured. Set GROQ_API_KEY.');
  return new GroqAIPlanner(config.data);
}
