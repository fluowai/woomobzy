import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/',
  '/vendas',
  '/consultoria',
  '/consultoria/qualificacao',
  '/login',
  '/register',
  '/onboarding',
];

test.describe('Smoke test das rotas públicas', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/public/texts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ texts: {} }),
      });
    });
  });

  for (const route of publicRoutes) {
    test(`renderiza a rota ${route} sem controles inválidos`, async ({
      page,
    }) => {
      await page.goto(route);
      await expect(page.locator('#root')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(
        'Application error: a client-side exception has occurred'
      );

      const buttons = page.getByRole('button');
      for (let index = 0; index < (await buttons.count()); index += 1) {
        const button = buttons.nth(index);
        if (await button.isVisible()) {
          const isDisabled = await button.isDisabled();
          if (!isDisabled) {
            await expect(button).toBeEnabled();
          }
        }
      }
    });
  }
});
