import { expect, test, type Page } from '@playwright/test';

const waitForAppBootstrap = async (page: Page) => {
  await expect(page.getByText('Carregando...', { exact: true })).toBeHidden({
    timeout: 15_000,
  });
};

test.describe('Autenticação e cadastro', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/public/texts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ texts: {} }),
      });
    });
  });

  test('exibe um formulário de login acessível', async ({ page }) => {
    await page.goto('/login');
    await waitForAppBootstrap(page);

    const email = page.getByLabel(/e-mail corporativo/i).first();
    const password = page.getByLabel(/^senha$/i).first();
    const submit = page.getByRole('button', { name: /entrar no painel/i });

    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(submit).toBeVisible();
    await expect(submit).toBeEnabled();
  });

  test('redireciona o registro para a primeira etapa do onboarding', async ({
    page,
  }) => {
    await page.goto('/register');
    await waitForAppBootstrap(page);

    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: /perfil da sua imobiliária/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /avançar/i })
    ).toBeVisible();
  });
});
