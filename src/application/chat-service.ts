import type { AIChatContext, AIChatPort, ChatMessage, ChatResult } from './interfaces/ai-chat';

const maxMessageLength = 4000;
const maxHistoryLength = 20;

export async function chatWithAI(
  chat: AIChatPort,
  messages: readonly ChatMessage[],
  context?: AIChatContext,
): Promise<ChatResult> {
  if (!messages.length || messages.length > maxHistoryLength)
    throw new Error('A conversation must contain between one and twenty messages.');
  const normalized = messages.map((message) => ({
    role: message.role,
    content: message.content.trim(),
  }));
  if (normalized.some((message) => !message.content || message.content.length > maxMessageLength)) {
    throw new Error('Chat messages must contain between one and four thousand characters.');
  }
  if (normalized[normalized.length - 1]?.role !== 'user')
    throw new Error('The latest chat message must be from the user.');
  return chat.generateChat(context ? { messages: normalized, context } : { messages: normalized });
}
