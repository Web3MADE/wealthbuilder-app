import { Clock3, MessageCircle, MoreHorizontal, Paperclip, PieChart, Settings } from 'lucide-react';
import type { PlanPolicyEvaluation } from '../planning/ExecutionPlan';
import type { ChatMessageView } from './chat-types';
import type { ActivePolicyView } from '../wealth/use-active-policy';
import type { FujiPortfolioView } from '../wealth/use-fuji-portfolio';
import { ActionCard } from './responses/ActionCard';
import { ConversationalResponse } from './responses/ConversationalResponse';
import { ExecutionFailure } from './responses/ExecutionFailure';
import { ExecutionLifecycle } from './responses/ExecutionLifecycle';
import { ExecutionSuccess } from './responses/ExecutionSuccess';
import { InsightCard } from './responses/InsightCard';
import { PolicyChangeCard } from './responses/PolicyChangeCard';
import { PolicySummaryCard } from './responses/PolicySummaryCard';

function Avatar() {
  return (
    <span className="chat-avatar" aria-label="WealthBuilder">
      W
    </span>
  );
}

export function ChatThread({
  messages,
  loading,
  error,
  isAttach,
  usePortfolio,
  policy,
  portfolio,
  policySavingId,
  onApplyPolicyChange,
  onCancelPolicyChange,
  onExecute,
}: {
  messages: readonly ChatMessageView[];
  loading: boolean;
  error: string;
  isAttach: boolean;
  usePortfolio: boolean;
  policy: ActivePolicyView | null;
  portfolio: FujiPortfolioView | null;
  policySavingId: string | null;
  onApplyPolicyChange: (message: ChatMessageView) => void;
  onCancelPolicyChange: (messageId: string) => void;
  onExecute: (messageId: string, evaluation: PlanPolicyEvaluation) => void;
}) {
  return (
    <div className="chat-thread">
      {messages.map((message) => {
        if (message.role === 'user') {
          return (
            <div className="chat-question" key={message.id}>
              <span>{message.content}</span>
              <small>now</small>
            </div>
          );
        }

        return (
          <div className="chat-assistant-message" key={message.id}>
            <div className="chat-reply-row">
              <Avatar />
              <ConversationalResponse content={message.content} />
            </div>
            {message.responseKind === 'insight' && portfolio && (
              <div className="chat-structured-response">
                <InsightCard portfolio={portfolio} interpretation={message.content} />
              </div>
            )}
            {message.responseKind === 'policy-summary' && policy && (
              <div className="chat-structured-response">
                <PolicySummaryCard policy={policy} />
              </div>
            )}
            {message.plan &&
              message.evaluations?.map((evaluation) => {
                const action = message.plan?.proposedActions[evaluation.actionIndex];
                if (!action) return null;
                const execution = message.executions?.[evaluation.actionIndex];
                if (execution?.status === 'completed') {
                  return (
                    <div className="chat-structured-response" key={evaluation.actionIndex}>
                      <ExecutionSuccess action={action} execution={execution} />
                    </div>
                  );
                }
                if (execution?.status === 'failed') {
                  return (
                    <div className="chat-structured-response" key={evaluation.actionIndex}>
                      <ExecutionFailure
                        execution={execution}
                        onRetry={() => onExecute(message.id, evaluation)}
                      />
                    </div>
                  );
                }
                if (execution) {
                  return (
                    <div className="chat-structured-response" key={evaluation.actionIndex}>
                      <ExecutionLifecycle action={action} execution={execution} />
                    </div>
                  );
                }
                return (
                  <div className="chat-structured-response" key={evaluation.actionIndex}>
                    <ActionCard
                      action={action}
                      plan={message.plan}
                      evaluation={evaluation}
                      onExecute={() => onExecute(message.id, evaluation)}
                    />
                  </div>
                );
              })}
            {message.policyChange && (
              <div className="chat-structured-response">
                <PolicyChangeCard
                  change={message.policyChange}
                  pending={policySavingId === message.id}
                  onApply={() => onApplyPolicyChange(message)}
                  onCancel={() => onCancelPolicyChange(message.id)}
                />
              </div>
            )}
          </div>
        );
      })}

      {loading && (
        <div className="chat-typing">
          <Avatar />
          <div>
            <span className="chat-typing-dots">
              <i />
              <i />
              <i />
            </span>
            <p>WealthBuilder is thinking…</p>
          </div>
        </div>
      )}

      {error && (
        <p className="chat-api-error" role="alert">
          {error}
        </p>
      )}

      {isAttach && (
        <div className="chat-context-card">
          <strong>Portfolio context</strong>
          <p>Context attachment is available for this conversation.</p>
          <small>{usePortfolio ? 'Portfolio context enabled' : 'Portfolio context disabled'}</small>
        </div>
      )}
    </div>
  );
}

export function ChatWelcome({
  error,
  onPrompt,
}: {
  error: string;
  onPrompt: (prompt: string) => void;
}) {
  const prompts = [
    'How is my portfolio performing?',
    'What should I do with my USDC?',
    'Find yield opportunities on Avalanche',
    'Explain my strategy in simple terms',
  ];

  return (
    <section className="chat-welcome">
      <div className="chat-orb" aria-hidden="true" />
      <h1>Your AI financial partner</h1>
      <p>
        Ask anything about your portfolio, strategy or the broader crypto market. I’ll help you make
        better decisions, within your Wealth Policy.
      </p>
      {error && (
        <p className="chat-api-error chat-catalog-error" role="alert">
          {error}
        </p>
      )}
      <div className="chat-prompts">
        {prompts.map((prompt) => (
          <button type="button" key={prompt} onClick={() => onPrompt(prompt)}>
            <span>{prompt}</span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function ChatMenu({
  usePortfolio,
  onNewChat,
  onShowConversation,
  onAttach,
  onUsePortfolio,
  onSettings,
}: {
  usePortfolio: boolean;
  onNewChat: () => void;
  onShowConversation: () => void;
  onAttach: () => void;
  onUsePortfolio: () => void;
  onSettings: () => void;
}) {
  return (
    <div className="chat-menu" role="menu" aria-label="Chat menu">
      <button type="button" role="menuitem" onClick={onNewChat}>
        <MessageCircle />
        New chat
        <MoreHorizontal />
      </button>
      <button type="button" role="menuitem" onClick={onShowConversation}>
        <Clock3 />
        View chat history
      </button>
      <button type="button" role="menuitem" onClick={onAttach}>
        <Paperclip />
        Attach file or image
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={usePortfolio}
        onClick={onUsePortfolio}
      >
        <PieChart />
        Use portfolio context
        <span className={`chat-switch ${usePortfolio ? 'on' : ''}`} />
      </button>
      <button type="button" role="menuitem" onClick={onSettings}>
        <Settings />
        Settings
      </button>
    </div>
  );
}
