import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('healthz responds 200', async ({ request }) => {
    const res = await request.get('/healthz');
    expect(res.status()).toBe(200);
  });

  test('readyz responds 200 or 503', async ({ request }) => {
    const res = await request.get('/readyz');
    expect([200, 503]).toContain(res.status());
  });

  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
  });
});
