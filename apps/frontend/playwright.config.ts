import { defineConfig, devices } from '@playwright/test';

// No `webServer` here on purpose — these specs exercise the checkout→
// webhook and chat→WebSocket-reply paths, which need the backend, Postgres,
// Redis, and the Stripe CLI forwarder all present. Only the full
// `docker compose up` stack provides that; a bare `next dev` can't stand in.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${process.env.FRONTEND_PORT ?? '3001'}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
