import { test, expect } from '@playwright/test';

function uniqueEmail(): string {
  return `e2e-checkout-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

// Drives Stripe's real hosted test-mode Checkout with the `4242…` test
// card — see design.md for why this replaces the originally-planned
// `stripe trigger` fixture approach. The webhook this produces is real,
// forwarded by the already-running Stripe CLI Compose service to our
// backend exactly as it would be in production.
test('completing Checkout flips the tier via the real forwarded webhook', async ({
  page,
}) => {
  const email = uniqueEmail();
  const password = 'correct-horse-battery-staple';

  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.locator('form').getByRole('button', { name: 'Register' }).click();
  await expect(
    page.getByRole('button', { name: 'Avatar options' }),
  ).toBeVisible();

  await page.goto('/#pricing');
  await page.getByRole('button', { name: 'Choose Lite', exact: true }).click();

  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });

  // United States collapses Stripe's billing-address section to just
  // Country + ZIP — the one country selection that keeps this deterministic
  // across whatever billing country a CI runner's IP would otherwise default
  // to (confirmed live: every other country pulls in address line/city/
  // region fields that vary by country).
  await page.getByLabel('Country or region').selectOption('United States');

  await page
    .getByRole('textbox', { name: 'Card number' })
    .fill('4242424242424242');
  await page.getByRole('textbox', { name: 'Expiration' }).fill('12/34');
  await page.getByRole('textbox', { name: 'CVC', exact: true }).fill('123');
  await page.getByRole('textbox', { name: 'Cardholder name' }).fill('E2E Test');
  await page.getByRole('textbox', { name: 'ZIP', exact: true }).fill('10001');

  await page.getByRole('button', { name: 'Subscribe' }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  // The redirect lands before the webhook necessarily has — the app's own
  // CheckoutSuccessNotice polls /auth/me until the tier flips, so wait on
  // its terminal text rather than the redirect alone.
  await expect(page.getByText('You’re on the', { exact: false })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('LITE', { exact: false }).first()).toBeVisible();

  await page.goto('/dashboard/settings');
  await expect(page.getByText('Current plan: LITE')).toBeVisible();
});
