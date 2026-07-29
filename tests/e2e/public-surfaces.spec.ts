import { expect, test, type Page } from '@playwright/test';

const monitorRuntimeErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  return errors;
};

const exposeMobileNavigation = async (page: Page) => {
  const enterButton = page
    .getByRole('button', { name: /Entrar no painel/i })
    .first();
  const viewportWidth = page.viewportSize()?.width || 0;

  if (viewportWidth < 1024) {
    await page.getByRole('button', { name: /Abrir menu/i }).click();
  }

  await expect(enterButton).toBeVisible();
  return enterButton;
};

test.describe('Superfícies públicas', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/public/texts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ texts: {} }),
      });
    });
  });

  test('landing comercial carrega com CTAs, UTF-8 e layout estável', async ({
    page,
  }) => {
    const runtimeErrors = monitorRuntimeErrors(page);
    await page.goto('/');

    await expect(page.locator('#root')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Agendar demonstração/i }).first()
    ).toBeVisible();
    await expect(await exposeMobileNavigation(page)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/�|Ã[£©§µ]/);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(hasHorizontalOverflow).toBe(false);
    expect(runtimeErrors).toEqual([]);
  });

  test('CTA de entrada abre o login funcional', async ({ page }) => {
    const runtimeErrors = monitorRuntimeErrors(page);
    await page.goto('/');
    await (await exposeMobileNavigation(page)).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel(/e-mail corporativo/i).first()).toBeVisible();
    await expect(page.getByLabel(/^senha$/i).first()).toBeVisible();
    expect(runtimeErrors).toEqual([]);
  });

  test('rota inexistente não expõe erro cru da aplicação', async ({ page }) => {
    await page.goto('/rota-que-nao-existe');
    await expect(page.locator('body')).not.toContainText(
      'Application error: a client-side exception has occurred'
    );
    await expect(page).toHaveURL(/\/login$/);
  });
});
