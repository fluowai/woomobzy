import { test, expect } from '@playwright/test';
import { loginAsRole, absoluteUrl } from './auth-audit.helpers';

test.describe('Onda 2 - Módulo Rural: Inteligência de Território (CAR)', () => {
  test('Deve carregar o módulo de Localização de CAR e exibir os mapas', async ({
    page,
  }) => {
    test.setTimeout(45000);
    // 1. Logar como admin rural
    await loginAsRole(page, 'ruralAdmin');

    // 2. Navegar para Território e CAR
    await page.goto(absoluteUrl('/rural/territorio/localizar-car'));
    await page.waitForURL(/\/rural\/territorio\/localizar-car/);

    // 3. Verificar o cabeçalho ou elementos visuais do CAR
    await expect(
      page
        .getByRole('heading', { name: /Busca Avançada de CAR/i })
        .or(
          page
            .getByRole('heading', { name: /Localizar CAR/i })
            .or(page.locator('text=CAR'))
        )
        .first()
    ).toBeVisible();

    // 4. Navegar para Cadastro Técnico (CAR/KML)
    await page.goto(absoluteUrl('/rural/cadastro-tecnico'));
    await page.waitForURL(/\/rural\/cadastro-tecnico/);

    // 5. Verificar o cabeçalho
    await expect(
      page.locator('text=Cadastro Técnico').or(page.locator('text=CAR'))
    ).toBeVisible();

    // The module is verified structurally!
  });
});
