import { test, expect } from '@playwright/test';

/**
 * AuthN/AuthZ regressions (Fase 2). Uses E2E_USER_EMAIL / E2E_USER_PASSWORD
 * from CI secrets. Skips if credentials are not present so local runs pass.
 */
const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe('auth', () => {
  test.skip(!email || !password, 'E2E credentials not configured');

  test('unauthenticated user cannot reach /admin', async ({ page }) => {
    const res = await page.goto('/admin');
    expect([401, 403]).toContain(res?.status() ?? 0);
  });

  test('login flow succeeds', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/e-?mail/i).fill(email!);
    await page.getByLabel(/senha|password/i).fill(password!);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|app|home)/);
  });
});
