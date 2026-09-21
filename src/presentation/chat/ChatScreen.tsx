'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity, ArrowUp, Bell, Clock3, Compass, History, Home, MessageCircle,
  MoreHorizontal, Paperclip, PieChart, Settings, ShieldCheck, Wallet,
} from 'lucide-react';
import type { ActionPlan } from '@/domain';
import type { ChatMessage } from '@/application/interfaces/ai-chat';
import { useSmartAccount } from '@/application/interfaces/smart-account';
import { WealthBuilderAccountControl } from '@/presentation/account/WealthBuilderAccountControl';
import { DevUserSwitcher } from '@/presentation/dev/DevUserSwitcher';
import { ExecutionPlan, type PlanExecution, type PlanExecutionAuthority, type PlanPolicyEvaluation } from '../planning/ExecutionPlan';
import '../planning/planning.css';
import './chat.css';

type ChatState = 'empty' | 'typing' | 'response' | 'action' | 'attach' | 'menu';
type PolicyChangeView = Readonly<{
  type: 'SET_MINIMUM_LIQUID_STABLE_RESERVE';
  minimumLiquidStableReserveBps: number;
  currentMinimumLiquidStableReservePercent: number;
  proposedMinimumLiquidStableReservePercent: number;
  state?: 'applied';
}>;
type ChatMessageView = ChatMessage & Readonly<{
  id: string;
  plan?: ActionPlan;
  evaluations?: readonly PlanPolicyEvaluation[];
  executions?: Readonly<Record<number, PlanExecution>>;
  policyChange?: PolicyChangeView;
}>;
type ChatModel = Readonly<{ id: string; label: string }>;

const validStates: ChatState[] = ['empty', 'typing', 'response', 'action', 'attach', 'menu'];
const prompts = [
  'How is my portfolio performing?',
  'What should I do with my USDC?',
  'Find yield opportunities on Avalanche',
  'Explain my strategy in simple terms',
];

function Brand({ mobile = false }: { mobile?: boolean }) {
  return <Link href="/home" className="chat-brand" aria-label="WealthBuilder home"><span className="chat-brand-mark"><Image src="/assets/WealthBuilder_logo.png" alt="" width={1774} height={887} priority /></span><strong>{mobile ? 'AI Chat' : 'WealthBuilder'}</strong></Link>;
}

function Avatar() { return <span className="chat-avatar" aria-label="WealthBuilder">W</span>; }

function Sidebar() {
  const primary = [{ href: '/home', label: 'Home', icon: Home }, { href: '/portfolio', label: 'Portfolio', icon: Wallet }, { href: '/strategy', label: 'Strategy', icon: ShieldCheck }, { href: '/home#quick-actions', label: 'Explore', icon: Compass }, { href: '/home#activity', label: 'Activity', icon: Activity }];
  return <aside className="chat-sidebar"><Brand/><nav aria-label="Main navigation">{primary.map(({ href, label, icon: Icon }) => <Link href={href} key={label}><Icon/>{label}</Link>)}<Link href="/chat" className="active" aria-current="page"><MessageCircle/>AI Chat</Link></nav><div className="chat-sidebar-bottom"><Link href="/strategy"><Settings/>Settings</Link><div><span>HK</span>Hakeem</div></div></aside>;
}

function BottomNav({ onMenu }: { onMenu: () => void }) {
  return <nav className="chat-bottom-nav" aria-label="Mobile navigation"><Link href="/home"><Home/>Home</Link><Link href="/portfolio"><Wallet/>Portfolio</Link><Link href="/strategy"><ShieldCheck/>Strategy</Link><Link href="/chat" className="active" aria-current="page"><MessageCircle/>AI Chat</Link><button type="button" onClick={onMenu}><MoreHorizontal/>More</button></nav>;
}

function UserMessage({ message }: { message: ChatMessageView }) {
  return <div className="chat-question"><span>{message.content}</span><small>now</small></div>;
}

function policyStatus(evaluations: readonly PlanPolicyEvaluation[]) {
  if (evaluations.some((evaluation) => evaluation.outcome === 'BLOCKED')) return 'blocked' as const;
  if (evaluations.some((evaluation) => evaluation.outcome === 'REQUIRES_APPROVAL')) return 'ready' as const;
  if (evaluations.some((evaluation) => evaluation.outcome === 'AUTONOMOUS_ALLOWED')) return 'allowed' as const;
  return 'proposed' as const;
}

function PolicyChangeCard({ change, pending, onApply, onCancel }: {
  change: PolicyChangeView;
  pending: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  return <section className="chat-policy-change" aria-label="Policy change proposal"><small>POLICY CHANGE</small><strong>Minimum liquid reserve</strong><p><span>Current</span>{change.currentMinimumLiquidStableReservePercent}% <b>→</b> <span>Proposed</span>{change.proposedMinimumLiquidStableReservePercent}%</p><span className="chat-policy-effect">WealthBuilder will keep at least {change.proposedMinimumLiquidStableReservePercent}% of your portfolio liquid before allowing an action.</span>{change.state === 'applied' ? <em>Your Wealth Policy has been updated.</em> : <div><button type="button" onClick={onApply} disabled={pending}>{pending ? 'Applying…' : 'Apply change'}</button><button type="button" onClick={onCancel} disabled={pending}>Cancel</button></div>}</section>;
}

function AssistantMessage({ message, policySaving, onApplyPolicyChange, onCancelPolicyChange, onExecute, authority }: {
  message: ChatMessageView;
  policySaving: boolean;
  onApplyPolicyChange: () => void;
  onCancelPolicyChange: () => void;
  onExecute: (evaluation: PlanPolicyEvaluation) => void;
  authority: PlanExecutionAuthority;
}) {
  const evaluations = message.evaluations ?? [];
  return <div className="chat-assistant-message"><div className="chat-reply-row"><Avatar/><div className="chat-reply-card"><p>{message.content}</p></div></div>{message.plan && <div className="chat-structured-plan"><ExecutionPlan plan={message.plan} status={policyStatus(evaluations)} evaluations={evaluations} executions={message.executions ?? {}} authority={authority} onExecute={onExecute} onRetry={onExecute}/></div>}{message.policyChange && <div className="chat-structured-plan"><PolicyChangeCard change={message.policyChange} pending={policySaving} onApply={onApplyPolicyChange} onCancel={onCancelPolicyChange}/></div>}</div>;
}

function TypingMessage() {
  return <div className="chat-typing"><Avatar/><div><span className="chat-typing-dots"><i/><i/><i/></span><p>WealthBuilder is thinking…</p></div></div>;
}

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
    if (validStates.includes(requested as ChatState) && (requested === 'attach' || requested === 'menu')) setState(requested as ChatState);
    fetch('/api/chat').then((response) => {
      if (!response.ok) throw new Error('Model list unavailable');
      return response.json() as Promise<{ defaultModel: string; models: ChatModel[] }>;
    }).then((catalog) => { setModels(catalog.models); setModel(catalog.defaultModel); }).catch(() => setError('Could not load OpenCode models.'));
  }, []);

  function show(next: ChatState) {
    setState(next);
    const url = new URL(window.location.href);
    if (next === 'empty' || next === 'response' || next === 'action' || next === 'typing') url.searchParams.delete('state');
    else url.searchParams.set('state', next);
    window.history.replaceState(null, '', url);
  }

  async function ask(value: string) {
    const text = value.trim();
    if (!text || loading || !model) return;
    const userMessage: ChatMessageView = { id: crypto.randomUUID(), role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);
    show('typing');
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, messages: nextMessages.map(({ role, content, evaluations }) => ({ role, content: evaluations?.length ? `${content}\n\n[Deterministic WealthBuilder policy decision: ${evaluations.map((evaluation) => `${evaluation.outcome} (${evaluation.reasons.map((reason) => reason.code).join(', ') || 'no violations'})`).join('; ')}]` : content })), ...(smartAccountAddress ? { smartAccountAddress } : {}) }) });
      const result = await response.json() as {
        message?: string;
        plan?: ActionPlan | null;
        evaluations?: PlanPolicyEvaluation[];
        policyChange?: PolicyChangeView | null;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? 'WealthBuilder could not answer right now.');
      const assistantMessage: ChatMessageView = { id: crypto.randomUUID(), role: 'assistant', content: result.message ?? 'I could not produce a response.', ...(result.plan ? { plan: result.plan, evaluations: result.evaluations ?? [] } : {}), ...(result.policyChange ? { policyChange: result.policyChange } : {}) };
      setMessages([...nextMessages, assistantMessage]);
      show(result.plan ? 'action' : 'response');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'WealthBuilder could not answer right now.');
      show('response');
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void ask(input); }

  function newChat() {
    setMessages([]); setInput(''); setError(''); show('empty');
  }

  async function applyPolicyChange(messageId: string, policyChange: PolicyChangeView) {
    setPolicySavingId(messageId);
    setError('');
    try {
      const response = await fetch('/api/chat/policy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: policyChange.type, minimumLiquidStableReserveBps: policyChange.minimumLiquidStableReserveBps }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Could not apply this policy change.');
      window.dispatchEvent(new Event('wealthbuilder-policy-updated'));
      window.dispatchEvent(new Event('wealthbuilder-activity-updated'));
      setMessages((current) => current.map((message) => message.id === messageId && message.policyChange
        ? { ...message, policyChange: { ...message.policyChange, state: 'applied' } }
        : message));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not apply this policy change.');
    } finally {
      setPolicySavingId(null);
    }
  }

  function cancelPolicyChange(messageId: string) {
    setMessages((current) => current.map((message) => {
      if (message.id !== messageId || !message.policyChange) return message;
      const { policyChange: _policyChange, ...withoutPolicyChange } = message;
      return withoutPolicyChange;
    }));
  }

  async function executeAction(messageId: string, evaluation: PlanPolicyEvaluation) {
    if (!evaluation.actionId) return;
    const action = messages.find((message) => message.id === messageId)?.plan?.proposedActions[evaluation.actionIndex];
    if (!smartAccountAddress || !action) {
      setError('Activate your WealthBuilder Account, then request a new plan before executing it.');
      return;
    }
    const index = evaluation.actionIndex;
    const updateExecution = (execution: PlanExecution) => setMessages((current) => current.map((message) => message.id === messageId
      ? { ...message, executions: { ...message.executions, [index]: execution } }
      : message));
    updateExecution({ status: 'preparing' });
    setError('');
    try {
      const grantedPermission = await grantAaveUsdcSupplyPermission(action.amount);
      updateExecution({ status: 'executing' });
      const response = await fetch('/api/chat/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actionId: evaluation.actionId, confirmedByUser: evaluation.outcome === 'REQUIRES_APPROVAL', smartAccountAddress: grantedPermission.smartAccountAddress, permissionId: grantedPermission.permissionId }),
      });
      const payload = await response.json() as { error?: string; retryable?: boolean; result?: { state: 'CONFIRMED' | 'FAILED'; reference?: string; failureReason?: string; retryable?: boolean; portfolio?: { walletUsdc: string; suppliedUsdc: string } } };
      if (!response.ok || !payload.result) {
        const executionError = new Error(payload.error ?? 'Your account could not start this action.') as Error & { retryable?: boolean };
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
        const updated = current.map((message) => message.id === messageId
          ? { ...message, executions: { ...message.executions, [index]: execution } }
          : message);
        if (payload.result?.state !== 'CONFIRMED') return updated;
        const action = current.find((message) => message.id === messageId)?.plan?.proposedActions[index];
        return [...updated, { id: crypto.randomUUID(), role: 'assistant', content: `Confirmed: supplied ${action?.amount ?? ''} ${action?.asset.toUpperCase() ?? ''} to ${action?.protocol ?? 'Aave V3'} through your WealthBuilder Account. Your portfolio context has been refreshed.` }];
      });
    } catch (requestError) {
      const retryable = !(requestError instanceof Error) || !('retryable' in requestError) || Boolean((requestError as Error & { retryable?: boolean }).retryable);
      const failure: PlanExecution = { status: 'failed', failureReason: requestError instanceof Error ? requestError.message : 'Your account could not complete this action.', ...(retryable ? { retryable: true } : {}) };
      setMessages((current) => current.map((message) => message.id === messageId
        ? { ...message, executions: { ...message.executions, [index]: failure } }
        : message));
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

  return <div className="ai-chat-page"><Sidebar/><div className="chat-main"><header className="chat-header"><div className="chat-mobile-status"><span>9:41</span><span>▮▮▮ ◆ ▰</span></div><div className="chat-mobile-brand"><Brand mobile/></div><div className="chat-header-controls"><WealthBuilderAccountControl compact/><div className="chat-header-tools"><button type="button" aria-label="Chat history" onClick={() => show('menu')}><History/></button><button type="button" aria-label="Notifications"><Bell/></button></div></div></header><main className={`chat-stage ${isEmpty ? 'is-empty' : ''} ${isMenu ? 'is-menu' : ''}`}>
    {isEmpty && <section className="chat-welcome"><div className="chat-orb" aria-hidden="true"/><h1>Your AI financial partner</h1><p>Ask anything about your portfolio, strategy or the broader crypto market. I’ll help you make better decisions, within your Wealth Policy.</p>{error && <p className="chat-api-error chat-catalog-error" role="alert">{error}</p>}<div className="chat-prompts">{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => void ask(prompt)}><span>{prompt}</span><span aria-hidden="true">→</span></button>)}</div></section>}
    {hasConversation && <div className="chat-thread">{messages.map((message) => message.role === 'user' ? <UserMessage key={message.id} message={message}/> : <AssistantMessage key={message.id} message={message} policySaving={policySavingId === message.id} onApplyPolicyChange={() => message.policyChange && void applyPolicyChange(message.id, message.policyChange)} onCancelPolicyChange={() => cancelPolicyChange(message.id)} onExecute={(evaluation) => void executeAction(message.id, evaluation)} authority={authority}/>)}{loading && <TypingMessage/>}{error && <p className="chat-api-error" role="alert">{error}</p>}{isAttach && <div className="chat-context-card"><strong>Portfolio context</strong><p>Context attachment is available for this conversation.</p><small>{usePortfolio ? 'Portfolio context enabled' : 'Portfolio context disabled'}</small></div>}</div>}
    {isMenu && <div className="chat-menu" role="menu" aria-label="Chat menu"><button type="button" role="menuitem" onClick={newChat}><MessageCircle/>New chat<MoreHorizontal/></button><button type="button" role="menuitem" onClick={() => show(messages.length ? 'response' : 'empty')}><Clock3/>View chat history</button><button type="button" role="menuitem" onClick={() => show('attach')}><Paperclip/>Attach file or image</button><button type="button" role="menuitemcheckbox" aria-checked={usePortfolio} onClick={() => setUsePortfolio(true)}><PieChart/>Use portfolio context<span className={`chat-switch ${usePortfolio ? 'on' : ''}`}/></button><button type="button" role="menuitem" onClick={() => show('empty')}><Settings/>Settings</button></div>}
  </main><div className="chat-composer-wrap"><form className="chat-composer" onSubmit={submit}><button type="button" className="chat-attach" aria-label="Attach context" onClick={() => show('attach')}><Paperclip/></button><label className="sr-only" htmlFor="chat-input">Ask WealthBuilder anything</label><input id="chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder={isEmpty || isAttach || isMenu || loading ? 'Ask WealthBuilder anything…' : 'Ask a follow up…'} disabled={loading}/><label className="chat-model-picker" htmlFor="chat-model"><span className="sr-only">Model</span><select id="chat-model" aria-label="AI model" value={model} onChange={(event) => setModel(event.target.value)} disabled={!models.length || loading}>{models.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><button type="submit" className="chat-send" aria-label="Send message" disabled={loading || !input.trim()}><ArrowUp/></button></form><p>I can make mistakes. Always review important actions.</p></div></div><BottomNav onMenu={() => show(isMenu ? 'empty' : 'menu')}/><DevUserSwitcher/></div>;
}
