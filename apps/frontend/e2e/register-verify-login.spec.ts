import { test, expect } from '@playwright/test';
import { getLatestVerificationLink } from './utils/mailpit';

function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

test('register, verify via the Mailpit-caught email, then log in', async ({
  page,
}) => {
  const email = uniqueEmail();
  const password = 'correct-horse-battery-staple';

  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.locator('form').getByRole('button', { name: 'Register' }).click();

  // Registration logs the user in immediately (real behavior, not a bug to
  // route around) — the header shows the account menu once it lands.
  await expect(
    page.getByRole('button', { name: 'Avatar options' }),
  ).toBeVisible();

  // The verification email is sent asynchronously via BullMQ; retry rather
  // than assume it has already arrived by the time registration returns.
  let token = '';
  await expect(async () => {
    token = await getLatestVerificationLink(email);
  }).toPass({ timeout: 15_000 });

  await page.goto(`/verify-email?token=${token}`);
  await expect(
    page.getByText('Your email is verified', { exact: false }),
  ).toBeVisible({ timeout: 10_000 });

  // A verified session logging in again lands on the dashboard with no
  // "verify your email" banner.
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(
    page.getByRole('link', { name: 'Login', exact: true }),
  ).toBeVisible();

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.locator('form').getByRole('button', { name: 'Login' }).click();
  // Login redirects client-side (router.push) on success — wait for it
  // before navigating again, or a `page.goto` fired mid-request can cancel
  // the in-flight login call before the refresh cookie is even set.
  await expect(
    page.getByRole('button', { name: 'Avatar options' }),
  ).toBeVisible();

  await page.goto('/dashboard');
  await expect(
    page.getByText("Your email isn't verified", { exact: false }),
  ).toHaveCount(0);
  await expect(page.getByText('No workspaces yet.')).toBeVisible();
});
