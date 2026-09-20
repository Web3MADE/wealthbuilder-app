import { expect, test } from '@playwright/test';

const wallet = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

test('connect, authenticate, view balances, save and reload a policy', async ({ page }) => {
  await page.addInitScript((address) => {
    let chainId = localStorage.getItem('testChainId') ?? '0x1';
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const emit = (event: string, value: unknown) =>
      listeners.get(event)?.forEach((listener) => listener(value));
    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      value: {
        isMetaMask: true,
        on(event: string, listener: (...args: unknown[]) => void) {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event)?.add(listener);
        },
        removeListener(event: string, listener: (...args: unknown[]) => void) {
          listeners.get(event)?.delete(listener);
        },
        async request({ method }: { method: string }) {
          if (method === 'eth_accounts')
            return localStorage.getItem('testConnected') ? [address] : [];
          if (method === 'eth_requestAccounts') {
            localStorage.setItem('testConnected', '1');
            emit('accountsChanged', [address]);
            return [address];
          }
          if (method === 'eth_chainId') return chainId;
          if (method === 'wallet_switchEthereumChain') {
            chainId = '0xa869';
            localStorage.setItem('testChainId', chainId);
            emit('chainChanged', chainId);
            return null;
          }
          if (method === 'personal_sign') return `0x${'1'.repeat(130)}`;
          return null;
        },
      },
    });
  }, wallet);

  let authenticated = false;
  let savedPolicy: Record<string, unknown> | null = null;
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ json: { wallet: authenticated ? wallet : null } }),
  );
  await page.route('**/api/auth/challenge', (route) =>
    route.fulfill({ json: { message: 'mock SIWE challenge' } }),
  );
  await page.route('**/api/auth/verify', (route) => {
    authenticated = true;
    return route.fulfill({ json: { wallet } });
  });
  await page.route('**/api/auth/logout', (route) => {
    authenticated = false;
    return route.fulfill({ json: { wallet: null } });
  });
  await page.route('**/api/portfolio', (route) =>
    route.fulfill({
      json: {
        wallet,
        network: 'Avalanche Fuji',
        estimatedUsdMicros: '50000000',
        pricingNote: 'Test USDC is valued at a configured $1. AVAX has no fiat quote.',
        positions: [
          {
            assetId: 'avax',
            symbol: 'AVAX',
            amountAtomic: '1000000000000000000',
            decimals: 18,
            estimatedUsdMicros: '0',
          },
          {
            assetId: 'usdc',
            symbol: 'USDC',
            amountAtomic: '50000000',
            decimals: 6,
            estimatedUsdMicros: '50000000',
          },
        ],
      },
    }),
  );
  await page.route('**/api/policy', async (route) => {
    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON() as Record<string, unknown>;
      savedPolicy = { ...input, id: 'policy-1', version: savedPolicy ? 2 : 1, wallet };
    }
    await route.fulfill({ json: { policy: savedPolicy } });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await expect(page.getByText('Wrong network')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Fuji' }).click();
  await page.getByRole('button', { name: 'Sign in with wallet' }).click();
  await expect(page.getByText('Active · v1')).toHaveCount(0);

  await page.getByRole('link', { name: 'View balances' }).click();
  await expect(page).toHaveURL(/\/portfolio$/, { timeout: 20_000 });
  await expect(page.getByText('AVAX', { exact: true })).toBeVisible();
  await expect(page.getByText('50', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Policy', exact: true }).click();
  await expect(page).toHaveURL(/\/policy$/, { timeout: 20_000 });
  await page.getByLabel('Maximum single transaction (USD)').fill('750');
  await page.getByRole('button', { name: 'Save policy' }).click();
  await expect(page.getByText('Saved version 1')).toBeVisible();
  await page.getByLabel('Minimum liquid stablecoin reserve (%)').fill('25');
  await page.getByRole('button', { name: 'Save policy' }).click();
  await expect(page.getByText('Saved version 2')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Saved version 2')).toBeVisible();
  await expect(page.getByLabel('Minimum liquid stablecoin reserve (%)')).toHaveValue('25');
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole('link', { name: 'Portfolio', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
