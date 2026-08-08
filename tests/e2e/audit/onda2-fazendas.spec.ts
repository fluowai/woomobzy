import { test, expect } from '@playwright/test';
import { loginAsRole, absoluteUrl } from './auth-audit.helpers';

test.describe('Onda 2 - Módulo Rural: Fazendas', () => {
  test('Deve acessar painel de propriedades rurais e criar uma nova fazenda', async ({
    page,
  }) => {
    test.setTimeout(45000);
    // 1. Logar como admin rural
    await loginAsRole(page, 'ruralAdmin');

    // 2. Navegar para Gestão de Fazendas (Imóveis)
    const isMobile = await page.evaluate(() => window.innerWidth < 768);
    if (isMobile) {
      await page
        .getByRole('button', { name: /abrir menu/i, exact: false })
        .click()
        .catch(() => {});
    }

    // In rural layout, it might be called "Fazendas e Glebas" or "Imóveis Rurais" or "Gestão de Ativos"
    // We'll navigate by URL directly to avoid locale/menu differences
    await page.goto(absoluteUrl('/rural/properties'));
    await page.waitForURL(/\/rural\/properties/);

    // 3. Verificar o cabeçalho correto
    await expect(page.locator('text=Invent')).toBeVisible();

    // 4. Criar nova fazenda
    await page.getByRole('button', { name: /Novo Ativo/i }).click();
    await page.waitForURL(/\/rural\/properties\/new/);

    // 5. Preencher formulário de criação
    const uniqueTitle = `Fazenda E2E ${Date.now()}`;
    await page
      .getByPlaceholder('Ex: Apartamento Moderno com Vista para o Mar')
      .fill(uniqueTitle);

    // Select type "Fazenda"
    // Usually it's a select or button
    // Let's just fill the value to 5000000 if there's an input
    const valueInputs = page.locator(
      'input[type="number"], input[placeholder*="Valor"], input[placeholder*="R$"]'
    );
    if ((await valueInputs.count()) > 0) {
      await valueInputs.first().fill('5000000');
    }

    // Save
    await page.getByRole('button', { name: /Salvar Alterações/i }).click();

    // Should redirect back to list
    await page.waitForURL(/\/rural\/properties$/);

    // 6. Verificar se a fazenda aparece na lista
    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible();
  });
});
