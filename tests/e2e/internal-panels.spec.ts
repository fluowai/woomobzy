import { expect, test } from '@playwright/test';

const internalRoutes = [
  '/rural/crm',
  '/rural/kanban',
  '/rural/properties',
  '/rural/whatsapp',
  '/urban/crm',
  '/urban/locacao',
  '/urban/properties',
];

test.describe('Proteção das rotas internas', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/public/texts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ texts: {} }),
      });
    });
  });

  for (const route of internalRoutes) {
    test(`protege ou renderiza ${route} sem quebrar`, async ({ page }) => {
      await page.goto(route);

      if (/\/login$/.test(page.url())) {
        await expect(
          page.getByRole('button', { name: /entrar no painel/i })
        ).toBeVisible();
        return;
      }

      await expect(page.locator('#root')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(
        'Application error: a client-side exception has occurred'
      );
    });
  }
});
