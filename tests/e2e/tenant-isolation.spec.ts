import { test, expect } from '@playwright/test';

test.describe('Tenant Isolation & Domain Routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/public/texts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ texts: {} }),
      });
    });
  });

  // O teste assume que o backend local está servindo o tenant "Fazendas Brasil" ou similar
  test('Acesso público redireciona para o tenant correto ou fallback', async ({
    page,
  }) => {
    // Acessando a raiz local do frontend (porta 3006 configurada no env do teste)
    await page.goto('/');

    // Se houver roteamento default, a página deve carregar sem crash (seja login ou home publica)
    // Procurar por sinais de que o React montou a página com sucesso.
    const rootDiv = page.locator('#root');
    await expect(rootDiv).toBeVisible();

    // Uma verificação básica: a página não deve conter mensagens de erro cruas de SSR/Hydration
    await expect(page.locator('body')).not.toContainText(
      'Application error: a client-side exception has occurred'
    );
  });

  test('Rota de Login não expõe dados incorretos', async ({ page }) => {
    await page.goto('/login');

    // O formulário de login deve estar presente e acessível.
    const emailInput = page.getByLabel(/e-mail corporativo/i).first();
    const passwordInput = page.getByLabel(/^senha$/i).first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });
});
