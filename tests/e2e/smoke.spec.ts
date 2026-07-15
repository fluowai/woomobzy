import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('landing page renders and has a title', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok(), 'GET / should return 2xx').toBeTruthy();
    await expect(page).toHaveTitle(/./);
  });

  test('login page is reachable', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status(), 'GET /login should not be 5xx').toBeLessThan(500);
  });

  test('no console errors on landing', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Filter noisy 3rd-party / expected warnings here if needed.
    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });
});
