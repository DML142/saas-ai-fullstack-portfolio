import { defineConfig, devices } from '@playwright/test';

// No `webServer` here on purpose — these specs need the backend, Postgres,
// Redis, and the Stripe CLI forwarder, which only `docker compose up` provides.
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
