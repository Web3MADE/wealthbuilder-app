'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Activity, ArrowRight, ArrowUp, BarChart3, Bell, Check, Clock3,
  Compass, History, Home, Lightbulb, MoreHorizontal,
  Paperclip, PieChart, Settings, ShieldCheck, Wallet,
} from 'lucide-react';
import './chat.css';

type ChatState = 'empty' | 'typing' | 'response' | 'action' | 'attach' | 'menu';
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

function Chart() {
  return <div className="chat-chart" role="img" aria-label="Illustrative portfolio performance: up 12.4% over 30 days"><svg viewBox="0 0 410 104" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chatChartFill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#23d970" stopOpacity=".22"/><stop offset="1" stopColor="#23d970" stopOpacity="0"/></linearGradient></defs><path d="M0 91 C15 90 19 84 29 82 S48 79 57 71 S76 72 85 63 S102 59 113 53 S131 55 142 46 S162 45 174 49 S194 58 207 50 S222 38 234 43 S247 53 258 45 S278 37 289 29 S305 35 318 36 S333 28 347 27 S363 25 375 23 S394 13 410 10 L410 104 L0 104Z" fill="url(#chatChartFill)"/><path d="M0 91 C15 90 19 84 29 82 S48 79 57 71 S76 72 85 63 S102 59 113 53 S131 55 142 46 S162 45 174 49 S194 58 207 50 S222 38 234 43 S247 53 258 45 S278 37 289 29 S305 35 318 36 S333 28 347 27 S363 25 375 23 S394 13 410 10" fill="none" stroke="#4bf277" strokeWidth="1.5"/></svg><span>+12.4%</span></div>;
}

function PortfolioReply({ onAction }: { onAction: () => void }) {
  return <><div className="chat-reply-row"><Avatar/><div className="chat-reply-card portfolio"><p>Your portfolio is up <strong>12.4%</strong> over the last 30 days, outperforming the market by 4.8%.</p><Chart/><div className="chat-chart-dates"><span>Aug 18</span><span>Aug 25</span><span>Sep 1</span><span>Sep 8</span><span>Sep 15</span></div><div className="chat-metrics"><div><small>Total value</small><strong>$12,428.52</strong></div><div><small>30D change</small><strong className="positive">+12.4%</strong></div><div><small>Top performer</small><strong>AVAX <em>+18.7%</em></strong></div></div><p className="chat-reply-outro">Your strategy remains on track. Would you like a breakdown by asset or some recommendations?</p></div></div><div className="chat-reply-actions"><button type="button" onClick={onAction}><BarChart3 size={16}/>View asset breakdown</button><button type="button" onClick={onAction}><Lightbulb size={16}/>See recommendations</button><button type="button" onClick={onAction} className="chat-desktop-only"><PieChart size={16}/>Explain performance</button></div></>;
}

function ActionReply() {
  return <div className="chat-reply-row"><Avatar/><div className="chat-reply-card action-card"><p><span className="desktop-copy">Based on your Wealth Policy and current market conditions, </span><span className="mobile-copy">This </span>could be a good opportunity<span className="desktop-copy">.</span><span className="mobile-copy"> based on your policy.</span></p><div className="chat-aave"><span className="chat-aave-icon">A</span><span><strong>Aave (Avalanche)</strong><small>Supply USDC</small></span><span className="chat-apy"><small><span className="desktop-copy">Estimated </span>APY</small><strong>5.2%</strong></span></div><h2>Why this fits your policy:</h2><ul><li><Check/>Matches your preference for stablecoin yield</li><li><Check/>Within your risk tolerance (Moderate)</li><li><Check/>Protocol is on your approved list</li><li><Check/>Keeps you within your liquidity reserve target</li></ul><div className="chat-caution"><span>!</span><p>This is a recommendation, not an automatic action. Review the details before executing.</p></div><div className="chat-action-buttons"><button type="button">Review and supply <ArrowRight size={16}/></button><button type="button">Show more options</button></div></div></div>;
}

function Sidebar() {
  const primary = [{href:'/home',label:'Home',icon:Home},{href:'/portfolio',label:'Portfolio',icon:Wallet},{href:'/strategy',label:'Strategy',icon:ShieldCheck},{href:'/home#quick-actions',label:'Explore',icon:Compass},{href:'/home#activity',label:'Activity',icon:Activity}];
  return <aside className="chat-sidebar"><Brand/><nav aria-label="Main navigation">{primary.map(({href,label,icon:Icon})=><Link href={href} key={label}><Icon/>{label}</Link>)}<Link href="/chat" className="active" aria-current="page"><MessageIcon/>AI Chat</Link></nav><div className="chat-sidebar-bottom"><Link href="/strategy"><Settings/>Settings</Link><div><span>HK</span>Hakeem</div></div></aside>;
}

function MessageIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 16a3 3 0 0 1-3 3H8l-4 2V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z"/><path d="M8 10h8M8 14h5"/></svg>; }

function BottomNav({ onMenu }: { onMenu: () => void }) {
  return <nav className="chat-bottom-nav" aria-label="Mobile navigation"><Link href="/home"><Home/>Home</Link><Link href="/portfolio"><Wallet/>Portfolio</Link><Link href="/strategy"><ShieldCheck/>Strategy</Link><Link href="/chat" className="active" aria-current="page"><MessageIcon/>AI Chat</Link><button type="button" onClick={onMenu}><MoreHorizontal/>More</button></nav>;
}

export function ChatScreen() {
  const [state, setState] = useState<ChatState>('empty');
  const [input, setInput] = useState('');
  const [question, setQuestion] = useState('How is my portfolio performing?');
  const [usePortfolio, setUsePortfolio] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('state');
    if (validStates.includes(requested as ChatState)) setState(requested as ChatState);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  function show(next: ChatState) {
    if (timer.current) clearTimeout(timer.current);
    setState(next);
    const url = new URL(window.location.href);
    if (next === 'empty') url.searchParams.delete('state'); else url.searchParams.set('state', next);
    window.history.replaceState(null, '', url);
  }

  function ask(value: string) {
    const text = value.trim();
    if (!text) return;
    setQuestion(text);
    setInput('');
    const next = /aave|supply|usdc|yield|recommend/i.test(text) ? 'action' : 'response';
    show('typing');
    timer.current = setTimeout(() => show(next), 1400);
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); ask(input); }
  const isEmpty = state === 'empty';
  const isMenu = state === 'menu';
  const isAttach = state === 'attach';
  const isAction = state === 'action';
  const hasConversation = state === 'typing' || state === 'response' || isAction || isAttach;

  return <div className="ai-chat-page"><Sidebar/><div className="chat-main"><header className="chat-header"><div className="chat-mobile-status"><span>9:41</span><span>▮▮▮ ◆ ▰</span></div><div className="chat-mobile-brand"><Brand mobile/></div><div className="chat-header-tools"><button type="button" aria-label="Chat history" onClick={() => show('menu')}><History/></button><button type="button" aria-label="Notifications"><Bell className={isAction ? 'has-alert' : ''}/></button></div></header><main className={`chat-stage ${isEmpty ? 'is-empty' : ''} ${isMenu ? 'is-menu' : ''}`}>
    {isEmpty && <section className="chat-welcome"><div className="chat-orb" aria-hidden="true"/><h1>Your AI financial partner</h1><p>Ask anything about your portfolio, strategy or the broader crypto market. I’ll help you make better decisions, within your Wealth Policy.</p><div className="chat-prompts">{prompts.map((prompt)=><button type="button" key={prompt} onClick={()=>ask(prompt)}><span>{prompt}</span><ArrowRight/></button>)}</div></section>}
    {hasConversation && <div className="chat-thread"><div className="chat-question"><span>{isAction ? 'Should I supply more USDC to Aave?' : isAttach ? 'Analyse this position' : question}</span><small>{isAction ? '10:37 AM' : '10:04 AM'}</small></div>{state === 'typing' && <div className="chat-typing"><Avatar/><div><span className="chat-typing-dots"><i/><i/><i/></span><p>Analysing your portfolio...</p></div></div>}{state === 'response' && <PortfolioReply onAction={() => show('action')}/ >}{isAction && <ActionReply/>}{isAttach && <><div className="chat-context-card"><strong>Analyse this position</strong><div><span className="chat-context-thumb"><BarChart3 size={19}/></span><span><b>AVAX Position</b><small>Screenshot · 12 KB</small></span></div><small>9:38 AM</small></div><div className="chat-reply-row"><Avatar/><div className="chat-reply-card context"><p>Got it. I’ll analyse this position for you...</p><span className="chat-typing-dots"><i/><i/><i/></span></div></div></>}</div>}
    {isMenu && <div className="chat-menu" role="menu" aria-label="Chat menu"><button type="button" role="menuitem" onClick={()=>show('empty')}><MessageIcon/>New chat<MoreHorizontal/></button><button type="button" role="menuitem" onClick={()=>show('response')}><Clock3/>View chat history</button><button type="button" role="menuitem" onClick={()=>show('attach')}><Paperclip/>Attach file or image</button><button type="button" role="menuitemcheckbox" aria-checked={usePortfolio} onClick={()=>setUsePortfolio(!usePortfolio)}><PieChart/>Use portfolio context<span className={`chat-switch ${usePortfolio ? 'on' : ''}`}/></button><button type="button" role="menuitem" onClick={()=>show('empty')}><Settings/>Settings</button></div>}
  </main><div className="chat-composer-wrap"><form className="chat-composer" onSubmit={submit}><button type="button" className="chat-attach" aria-label="Attach context" onClick={()=>show('attach')}><Paperclip/></button><label className="sr-only" htmlFor="chat-input">Ask WealthBuilder anything</label><input id="chat-input" value={input} onChange={event=>setInput(event.target.value)} placeholder={isEmpty || isAttach || isMenu || state === 'typing' ? 'Ask WealthBuilder anything...' : 'Ask a follow up...'} /><button type="submit" className="chat-send" aria-label="Send message"><ArrowUp/></button></form><p>I can make mistakes. Always review important actions.</p></div></div><BottomNav onMenu={()=>show(isMenu ? 'empty' : 'menu')}/></div>;
}
