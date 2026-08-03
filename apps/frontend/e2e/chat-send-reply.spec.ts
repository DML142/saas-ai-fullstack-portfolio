import { test, expect } from '@playwright/test';

function uniqueEmail(): string {
  return `e2e-chat-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

test('a sent message gets a simulated reply over the real WebSocket connection', async ({
  page,
}) => {
  const email = uniqueEmail();

  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct-horse-battery-staple');
  await page.locator('form').getByRole('button', { name: 'Register' }).click();
  // Wait for the redirect the successful register triggers before
  // navigating again — a `page.goto` fired mid-request can cancel the
  // in-flight call before the refresh cookie is set, bouncing RequireAuth
  // back to /login.
  await expect(
    page.getByRole('button', { name: 'Avatar options' }),
  ).toBeVisible();

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Create new workspace.' }).click();

  const messageInput = page.getByPlaceholder('Enter message here.');
  await expect(messageInput).toBeEnabled();
  await messageInput.fill('Hello from Playwright');
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(page.getByText('Hello from Playwright')).toBeVisible();
  await expect(page.getByText('COS Assistant is typing…')).toBeVisible();

  // The reply processor waits 1–3s before writing the assistant message and
  // pushing it over the socket — no page reload happens between send and
  // this assertion, so a pass here is proof the WebSocket delivery path
  // (not a poll or a refetch) is what rendered it.
  await expect(
    page.getByText("This reply isn't connected to any LLM API", {
      exact: false,
    }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('COS Assistant is typing…')).toHaveCount(0);
});
