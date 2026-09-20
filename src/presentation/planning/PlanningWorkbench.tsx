'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { ActionPlan } from '@/domain';
import type { PlannerMetadata } from '@/application/interfaces/ai-planner';
import { ExecutionPlan, planStatuses, type PlanStatus } from './ExecutionPlan';
import './planning.css';

export function PlanningWorkbench() {
  const [request, setRequest] = useState('Put some of my idle USDC to work.');
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [metadata, setMetadata] = useState<PlannerMetadata | null>(null);
  const [status, setStatus] = useState<PlanStatus>('proposed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [models, setModels] = useState<{ id: string; label: string }[]>([]);
  const [model, setModel] = useState('');

  useEffect(() => {
    fetch('/api/dev/plan').then((response) => {
      if (!response.ok) throw new Error('Model list unavailable');
      return response.json();
    }).then((catalog) => { setModels(catalog.models); setModel(catalog.defaultModel); })
      .catch(() => setError('Could not load OpenCode models.'));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(''); setPlan(null); setMetadata(null); setStatus('proposed');
    try {
      const response = await fetch('/api/dev/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ request, model }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? 'Planning failed.'); setMetadata(result.metadata ?? null); return; }
      setPlan(result.plan); setMetadata(result.metadata);
    } catch { setError('Could not reach the planning service.'); }
    finally { setLoading(false); }
  }

  return <main className="planning-page"><header><Link href="/chat" className="planning-back">← AI Chat</Link><span>WEALTHBUILDER · DEVELOPMENT</span></header><div className="planning-content"><h1>AI Planning</h1><p>Send a financial request to OpenCode and inspect its validated proposal.</p><form onSubmit={submit}><label htmlFor="planning-request">Your request</label><textarea id="planning-request" value={request} onChange={(event)=>setRequest(event.target.value)} maxLength={1000} rows={3}/><label htmlFor="planning-model">Model</label><select id="planning-model" className="planning-model" value={model} onChange={event=>setModel(event.target.value)} disabled={!models.length}>{models.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select><button type="submit" disabled={loading || !request.trim() || !model}>{loading ? 'Creating plan…' : 'Create plan'}</button></form>{error && <p className="planning-error" role="alert">{error}</p>}{plan && <><div className="planning-status-control"><label htmlFor="planning-status">Preview status</label><select id="planning-status" value={status} onChange={event=>setStatus(event.target.value as PlanStatus)}>{planStatuses.map(item=><option key={item} value={item}>{item}</option>)}</select></div><ExecutionPlan plan={plan} status={status}/></>}{metadata && <div className="planning-metadata"><h2>Provider metadata</h2><dl><div><dt>Provider</dt><dd>{metadata.provider}</dd></div><div><dt>Model</dt><dd>{metadata.model}</dd></div><div><dt>Endpoint family</dt><dd>{metadata.endpointFamily ?? 'unknown'}</dd></div><div><dt>Latency</dt><dd>{metadata.latencyMs} ms</dd></div><div><dt>Success</dt><dd>{String(metadata.success)}</dd></div><div><dt>Schema failure</dt><dd>{String(metadata.schemaValidationFailure)}</dd></div>{metadata.apiStatus !== undefined && <div><dt>API status</dt><dd>{metadata.apiStatus}</dd></div>}{metadata.apiErrorCode && <div><dt>API error</dt><dd>{metadata.apiErrorCode}</dd></div>}</dl></div>}</div></main>;
}
