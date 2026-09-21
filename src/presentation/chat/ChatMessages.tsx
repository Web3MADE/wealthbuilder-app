import { Clock3, MessageCircle, MoreHorizontal, Paperclip, PieChart, Settings } from 'lucide-react';
import type { PlanExecutionAuthority, PlanPolicyEvaluation } from '../planning/ExecutionPlan';
import { ExecutionPlan } from '../planning/ExecutionPlan';
import type { ChatMessageView, PolicyChangeView } from './chat-types';

function Avatar() {
  return (
    <span className="chat-avatar" aria-label="WealthBuilder">
      W
    </span>
  );
}

function policyStatus(evaluations: readonly PlanPolicyEvaluation[]) {
  if (evaluations.some((evaluation) => evaluation.outcome === 'BLOCKED')) return 'blocked' as const;
  if (evaluations.some((evaluation) => evaluation.outcome === 'REQUIRES_APPROVAL')) {
    return 'ready' as const;
  }
  if (evaluations.some((evaluation) => evaluation.outcome === 'AUTONOMOUS_ALLOWED')) {
    return 'allowed' as const;
  }
  return 'proposed' as const;
}

function PolicyChangeCard({
  change,
  pending,
  onApply,
  onCancel,
}: {
  change: PolicyChangeView;
  pending: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="chat-policy-change" aria-label="Policy change proposal">
      <small>POLICY CHANGE</small>
      <strong>Minimum liquid reserve</strong>
      <p>
        <span>Current</span>
        {change.currentMinimumLiquidStableReservePercent}% <b>→</b> <span>Proposed</span>
        {change.proposedMinimumLiquidStableReservePercent}%
      </p>
      <span className="chat-policy-effect">
        WealthBuilder will keep at least {change.proposedMinimumLiquidStableReservePercent}% of your
        portfolio liquid before allowing an action.
      </span>
      {change.state === 'applied' ? (
        <em>Your Wealth Policy has been updated.</em>
      ) : (
        <div>
          <button type="button" onClick={onApply} disabled={pending}>
            {pending ? 'Applying…' : 'Apply change'}
          </button>
          <button type="button" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}

export function ChatThread({
  messages,
  loading,
  error,
  isAttach,
  usePortfolio,
  policySavingId,
  authority,
  onApplyPolicyChange,
  onCancelPolicyChange,
  onExecute,
}: {
  messages: readonly ChatMessageView[];
  loading: boolean;
  error: string;
  isAttach: boolean;
  usePortfolio: boolean;
  policySavingId: string | null;
  authority: PlanExecutionAuthority;
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

        const evaluations = message.evaluations ?? [];
        return (
          <div className="chat-assistant-message" key={message.id}>
            <div className="chat-reply-row">
              <Avatar />
              <div className="chat-reply-card">
                <p>{message.content}</p>
              </div>
            </div>
            {message.plan && (
              <div className="chat-structured-plan">
                <ExecutionPlan
                  plan={message.plan}
                  status={policyStatus(evaluations)}
                  evaluations={evaluations}
                  executions={message.executions ?? {}}
                  authority={authority}
                  onExecute={(evaluation) => onExecute(message.id, evaluation)}
                  onRetry={(evaluation) => onExecute(message.id, evaluation)}
                />
              </div>
            )}
            {message.policyChange && (
              <div className="chat-structured-plan">
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
