'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DevActivity } from '@/infrastructure/dev/dev-activity-store';

export function useDevActivity() {
  const [items, setItems] = useState<readonly DevActivity[]>([]);
  const [error, setError] = useState(false);
  const refresh = useCallback(() => {
    fetch('/api/activity/current', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Activity unavailable');
        return response.json() as Promise<{ items: readonly DevActivity[] }>;
      })
      .then((next) => {
        setItems(next.items);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('wealthbuilder-activity-updated', refresh);
    return () => window.removeEventListener('wealthbuilder-activity-updated', refresh);
  }, [refresh]);

  return { items, error, refresh };
}

export function activityTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1_000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}
