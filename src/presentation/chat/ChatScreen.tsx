'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Bell, History } from 'lucide-react';
import type { ActionPlan } from '@/domain';
import { useSmartAccount } from '@/application/interfaces/smart-account';
import { WealthBuilderAccountControl } from '@/presentation/account/WealthBuilderAccountControl';
import { DevUserSwitcher } from '@/presentation/dev/DevUserSwitcher';
import type {
  PlanExecution,
  PlanExecutionAuthority,
  PlanPolicyEvaluation,
} from '../planning/ExecutionPlan';
import '../planning/planning.css';
import { ChatComposer } from './ChatComposer';
import { ChatMenu, ChatThread, ChatWelcome } from './ChatMessages';
import { ChatBottomNavigation, ChatMobileBrand, ChatSidebar } from './ChatNavigation';
import type { ChatMessageView, ChatModel, ChatState, PolicyChangeView } from './chat-types';
import './chat.css';

const validStates: readonly ChatState[] = [
  'empty',
  'typing',
  'response',
  'action',
  'attach',
  'menu',
];

type ChatResponse = Readonly<{
  message?: string;
  plan?: ActionPlan | null;
  evaluations?: PlanPolicyEvaluation[];
  policyChange?: PolicyChangeView | null;
  error?: string;
}>;

export function ChatScreen() {
  const [state, setState] = useState<ChatState>('empty');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [models, setModels] = useState<ChatModel[]>([]);
  const [model, setModel] = useState('gpt-5.6-luna');
  const [usePortfolio, setUsePortfolio] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [policySavingId, setPolicySavingId] = useState<string | null>(null);
  const { smartAccountAddress, permission, grantAaveUsdcSupplyPermission } = useSmartAccount();

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('state');
    if (
      validStates.includes(requested as ChatState) &&
      (requested === 'attach' || requested === 'menu')
    ) {
      setState(requested as ChatState);
    }

    fetch('/api/chat')
      .then((response) => {
        if (!response.ok) throw new Error('Model list unavailable');
        return response.json() as Promise<{ defaultModel: string; models: ChatModel[] }>;
      })
      .then((catalog) => {
        setModels(catalog.models);
        setModel(catalog.defaultModel);
      })
      .catch(() => setError('Could not load OpenCode models.'));
  }, []);

  function show(next: ChatState) {
    setState(next);
    const url = new URL(window.location.href);
    if (next === 'empty' || next === 'response' || next === 'action' || next === 'typing') {
      url.searchParams.delete('state');
    } else {
      url.searchParams.set('state', next);
    }
    window.history.replaceState(null, '', url);
  }

  async function ask(value: string) {
    const text = value.trim();
    if (!text || loading || !model) return;

    const userMessage: ChatMessageView = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);
    show('typing');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: nextMessages.map(({ role, content, evaluations }) => ({
            role,
            content: evaluations?.length
              ? `${content}\n\n[Deterministic WealthBuilder policy decision: ${evaluations
                  .map(
                    (evaluation) =>
                      `${evaluation.outcome} (${evaluation.reasons.map((reason) => reason.code).join(', ') || 'no violations'})`,
                  )
                  .join('; ')}]`
              : content,
          })),
          ...(smartAccountAddress ? { smartAccountAddress } : {}),
        }),
      });
      const result = (await response.json()) as ChatResponse;
      if (!response.ok)
        throw new Error(result.error ?? 'WealthBuilder could not answer right now.');

      const assistantMessage: ChatMessageView = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.message ?? 'I could not produce a response.',
        ...(result.plan ? { plan: result.plan, evaluations: result.evaluations ?? [] } : {}),
        ...(result.policyChange ? { policyChange: result.policyChange } : {}),
      };
      setMessages([...nextMessages, assistantMessage]);
      show(result.plan ? 'action' : 'response');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'WealthBuilder could not answer right now.',
      );
      show('response');
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  function newChat() {
    setMessages([]);
    setInput('');
    setError('');
    show('empty');
  }

  async function applyPolicyChange(message: ChatMessageView) {
    if (!message.policyChange) return;

    setPolicySavingId(message.id);
    setError('');
    try {
      const response = await fetch('/api/chat/policy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: message.policyChange.type,
          minimumLiquidStableReserveBps: message.policyChange.minimumLiquidStableReserveBps,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Could not apply this policy change.');

      window.dispatchEvent(new Event('wealthbuilder-policy-updated'));
      window.dispatchEvent(new Event('wealthbuilder-activity-updated'));
      setMessages((current) =>
        current.map((currentMessage) =>
          currentMessage.id === message.id && currentMessage.policyChange
            ? {
                ...currentMessage,
                policyChange: { ...currentMessage.policyChange, state: 'applied' },
              }
            : currentMessage,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not apply this policy change.',
      );
    } finally {
      setPolicySavingId(null);
    }
  }

  function cancelPolicyChange(messageId: string) {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId || !message.policyChange) return message;
        const { policyChange: _policyChange, ...withoutPolicyChange } = message;
        return withoutPolicyChange;
      }),
    );
  }

  async function executeAction(messageId: string, evaluation: PlanPolicyEvaluation) {
    if (!evaluation.actionId) return;

    const action = messages.find((message) => message.id === messageId)?.plan?.proposedActions[
      evaluation.actionIndex
    ];
    if (!smartAccountAddress || !action) {
      setError('Activate your WealthBuilder Account, then request a new plan before executing it.');
      return;
    }

    const updateExecution = (execution: PlanExecution) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                executions: { ...message.executions, [evaluation.actionIndex]: execution },
              }
            : message,
        ),
      );
    };

    updateExecution({ status: 'preparing' });
    setError('');

    try {
      const grantedPermission = await grantAaveUsdcSupplyPermission(action.amount);
      updateExecution({ status: 'executing' });

      const response = await fetch('/api/chat/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          actionId: evaluation.actionId,
          confirmedByUser: evaluation.outcome === 'REQUIRES_APPROVAL',
          smartAccountAddress: grantedPermission.smartAccountAddress,
          permissionId: grantedPermission.permissionId,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        retryable?: boolean;
        result?: {
          state: 'CONFIRMED' | 'FAILED';
          reference?: string;
          failureReason?: string;
          retryable?: boolean;
          portfolio?: { walletUsdc: string; suppliedUsdc: string };
        };
      };
      if (!response.ok || !payload.result) {
        const executionError = new Error(
          payload.error ?? 'Your account could not start this action.',
        ) as Error & { retryable?: boolean };
        executionError.retryable = Boolean(payload.retryable);
        throw executionError;
      }

      updateExecution({ status: 'confirming' });
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const execution: PlanExecution = {
        status: payload.result.state === 'CONFIRMED' ? 'completed' : 'failed',
        ...(payload.result.reference ? { reference: payload.result.reference } : {}),
        ...(payload.result.failureReason ? { failureReason: payload.result.failureReason } : {}),
        ...(payload.result.retryable ? { retryable: true } : {}),
        ...(payload.result.portfolio ? { portfolio: payload.result.portfolio } : {}),
      };
      window.dispatchEvent(new Event('wealthbuilder-activity-updated'));

      setMessages((current) => {
        const updated = current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                executions: { ...message.executions, [evaluation.actionIndex]: execution },
              }
            : message,
        );
        if (payload.result?.state !== 'CONFIRMED') return updated;

        const completedAction = current.find((message) => message.id === messageId)?.plan
          ?.proposedActions[evaluation.actionIndex];
        return [
          ...updated,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Confirmed: supplied ${completedAction?.amount ?? ''} ${completedAction?.asset.toUpperCase() ?? ''} to ${completedAction?.protocol ?? 'Aave V3'} through your WealthBuilder Account. Your portfolio context has been refreshed.`,
          },
        ];
      });
    } catch (requestError) {
      const retryable =
        !(requestError instanceof Error) ||
        !('retryable' in requestError) ||
        Boolean((requestError as Error & { retryable?: boolean }).retryable);
      updateExecution({
        status: 'failed',
        failureReason:
          requestError instanceof Error
            ? requestError.message
            : 'Your account could not complete this action.',
        ...(retryable ? { retryable: true } : {}),
      });
    }
  }

  const isEmpty = state === 'empty' && messages.length === 0;
  const isMenu = state === 'menu';
  const isAttach = state === 'attach';
  const hasConversation = messages.length > 0 || loading || isAttach;
  const authority: PlanExecutionAuthority = {
    status: permission ? 'active' : smartAccountAddress ? 'ready' : 'not_ready',
    ...(smartAccountAddress ? { smartAccountAddress } : {}),
    ...(permission?.expiresAt ? { expiresAt: permission.expiresAt } : {}),
  };

  return (
    <div className="ai-chat-page">
      <ChatSidebar />
      <div className="chat-main">
        <header className="chat-header">
          <div className="chat-mobile-status">
            <span>9:41</span>
            <span>▮▮▮ ◆ ▰</span>
          </div>
          <div className="chat-mobile-brand">
            <ChatMobileBrand />
          </div>
          <div className="chat-header-controls">
            <WealthBuilderAccountControl compact />
            <div className="chat-header-tools">
              <button type="button" aria-label="Chat history" onClick={() => show('menu')}>
                <History />
              </button>
              <button type="button" aria-label="Notifications">
                <Bell />
              </button>
            </div>
          </div>
        </header>

        <main className={`chat-stage ${isEmpty ? 'is-empty' : ''} ${isMenu ? 'is-menu' : ''}`}>
          {isEmpty && <ChatWelcome error={error} onPrompt={(prompt) => void ask(prompt)} />}
          {hasConversation && (
            <ChatThread
              messages={messages}
              loading={loading}
              error={error}
              isAttach={isAttach}
              usePortfolio={usePortfolio}
              policySavingId={policySavingId}
              authority={authority}
              onApplyPolicyChange={(message) => void applyPolicyChange(message)}
              onCancelPolicyChange={cancelPolicyChange}
              onExecute={(messageId, evaluation) => void executeAction(messageId, evaluation)}
            />
          )}
          {isMenu && (
            <ChatMenu
              usePortfolio={usePortfolio}
              onNewChat={newChat}
              onShowConversation={() => show(messages.length ? 'response' : 'empty')}
              onAttach={() => show('attach')}
              onUsePortfolio={() => setUsePortfolio(true)}
              onSettings={() => show('empty')}
            />
          )}
        </main>

        <ChatComposer
          input={input}
          model={model}
          models={models}
          state={state}
          loading={loading}
          onInputChange={setInput}
          onModelChange={setModel}
          onAttach={() => show('attach')}
          onSubmit={submit}
        />
      </div>

      <ChatBottomNavigation onMenu={() => show(isMenu ? 'empty' : 'menu')} />
      <DevUserSwitcher />
    </div>
  );
}
