'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEV_MODE_KEY,
  devToolsEnabled,
  resetDevState,
  resolveDevUserMode,
  saveDevUserMode,
  type DevUserMode,
} from './dev-user-mode';
import '@/presentation/home/home.css';

const enabled = devToolsEnabled(process.env.NODE_ENV, process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS);

export function DevUserSwitcher() {
  const router = useRouter();
  const [mode, setMode] = useState<DevUserMode>('new');

  useEffect(() => {
    if (enabled)
      queueMicrotask(() =>
        setMode(resolveDevUserMode(null, window.localStorage.getItem(DEV_MODE_KEY))),
      );
  }, []);

  if (!enabled) return null;

  const choose = (next: DevUserMode) => {
    saveDevUserMode(window.localStorage, next);
    setMode(next);
    router.push(`/?devUser=${next}`);
  };
  const reset = () => {
    resetDevState(window.localStorage);
    setMode('new');
    router.push('/');
  };

  return (
    <details className="dev-user-switcher">
      <summary aria-label="Open development user modes">DEV</summary>
      <div aria-label="Development user mode">
        <button
          type="button"
          className={mode === 'new' ? 'active' : ''}
          onClick={() => choose('new')}
        >
          New user
        </button>
        <button
          type="button"
          className={mode === 'existing' ? 'active' : ''}
          onClick={() => choose('existing')}
        >
          Existing user
        </button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
    </details>
  );
}
