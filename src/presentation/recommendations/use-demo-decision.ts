'use client';

import { useEffect, useState } from 'react';

export type DemoDecision = Readonly<{
  outcome: 'BLOCKED' | 'REQUIRES_APPROVAL' | 'AUTONOMOUS_ALLOWED';
  actionValueMicros: string;
  violations: readonly Readonly<{ code: string; message: string }>[];
}>;

export function useDemoDecision({
  amountUsdc,
  reserveBps,
  autonomousLimitUsdc,
}: Readonly<{ amountUsdc: number; reserveBps: number; autonomousLimitUsdc: number }>) {
  const [decision, setDecision] = useState<DemoDecision | null>(null);
  useEffect(() => {
    let active = true;
    void fetch('/api/demo/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amountUsdc, reserveBps, autonomousLimitUsdc }),
    })
      .then(async (response) =>
        response.ok
          ? (response.json() as Promise<DemoDecision>)
          : Promise.reject(new Error('Evaluation failed')),
      )
      .then((next) => {
        if (active) setDecision(next);
      })
      .catch(() => {
        if (active) setDecision(null);
      });
    return () => {
      active = false;
    };
  }, [amountUsdc, reserveBps, autonomousLimitUsdc]);
  return decision;
}
