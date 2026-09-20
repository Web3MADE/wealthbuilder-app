import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:3107', browserName: 'chromium' },
  webServer: {
    command: 'pnpm dev --port 3107',
    url: 'http://127.0.0.1:3107',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      WEALTHBUILDER_NEXT_DIST_DIR: '.next-playwright',
      SESSION_SECRET: 'playwright-session-secret-longer-than-thirty-two-chars',
    },
  },
});
