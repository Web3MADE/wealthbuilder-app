import { describe, expect, it } from 'vitest';
import {
  DEV_MODE_KEY,
  ONBOARDING_KEY,
  devToolsEnabled,
  resetDevState,
  resolveDevUserMode,
  routeForDevUser,
  saveDevUserMode,
} from '@/presentation/dev/dev-user-mode';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('development personas', () => {
  it('sends a fresh or explicitly new user to onboarding', () => {
    expect(routeForDevUser(resolveDevUserMode(null, null))).toBe('/onboarding');
    expect(routeForDevUser(resolveDevUserMode('new', 'existing'))).toBe('/onboarding');
  });

  it('persists the existing-user selection across refresh', () => {
    const store = storage();
    const mode = resolveDevUserMode('existing', null);
    saveDevUserMode(store, mode);
    expect(routeForDevUser(mode)).toBe('/home');
    expect(routeForDevUser(resolveDevUserMode(null, store.getItem(DEV_MODE_KEY)))).toBe('/home');
  });

  it('clears persona and onboarding state on reset', () => {
    const store = storage();
    store.setItem(DEV_MODE_KEY, 'existing');
    store.setItem(ONBOARDING_KEY, 'saved progress');
    resetDevState(store);
    expect(store.getItem(DEV_MODE_KEY)).toBeNull();
    expect(store.getItem(ONBOARDING_KEY)).toBeNull();
    expect(routeForDevUser(resolveDevUserMode(null, store.getItem(DEV_MODE_KEY)))).toBe('/onboarding');
  });

  it('hides the switcher when disabled or in production', () => {
    expect(devToolsEnabled('development', undefined)).toBe(true);
    expect(devToolsEnabled('development', 'false')).toBe(false);
    expect(devToolsEnabled('production', 'true')).toBe(false);
  });
});
