import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  // Auto-starts the dev server unless a base URL is explicitly given (e.g.
  // pointing at an already-running instance).
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3001',
        reuseExistingServer: true,
        timeout: 60_000,
      },
  projects: [
    // Every spec that needs no wallet extension; this is what CI runs.
    {
      name: 'chromium',
      testIgnore: ['**/wallet-flow.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    // Needs a local Freighter setup (see the spec), so it is not run in CI.
    {
      name: 'wallet',
      testMatch: ['**/wallet-flow.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
