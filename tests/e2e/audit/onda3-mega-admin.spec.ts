import { test, expect } from '@playwright/test';
import {
  absoluteUrl,
  loginAsRole,
  attachRuntimeMonitor,
  expectNoRuntimeErrors,
} from './auth-audit.helpers';

test.describe('Onda 3 - Mega Admin: Franquias e Analytics', () => {
  test('Deve acessar as principais áreas do painel Mega Admin', async ({ page }) => {
    const runtimeErrors = attachRuntimeMonitor(page);
    await loginAsRole(page, 'megaAdmin');

    // Navegar para Gestão de Franquias
    await page.goto(absoluteUrl('/megaadmin/resellers'));
    await expect(page.getByRole('heading', { name: /Resellers/i }).first()).toBeVisible({ timeout: 15000 });
    
    // Navegar para Analytics Master
    await page.goto(absoluteUrl('/megaadmin/analytics'));
    await expect(page.getByRole('heading', { name: /Métricas/i }).first()).toBeVisible();

  });
});
