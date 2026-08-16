import { test, expect } from '@playwright/test';
import {
  absoluteUrl,
  loginAsRole,
  attachRuntimeMonitor,
  expectNoRuntimeErrors,
} from './auth-audit.helpers';

test.describe('Onda 3 - Super Admin: Gestão', () => {
  test('Deve acessar as principais áreas do painel Super Admin', async ({
    page,
  }) => {
    const runtimeErrors = attachRuntimeMonitor(page);
    await loginAsRole(page, 'superAdmin');

    // Navegar para Tenants
    await page.goto(absoluteUrl('/superadmin/tenants'));
    await expect(
      page.getByRole('heading', { name: /Imobiliárias/i }).first()
    ).toBeVisible({ timeout: 15000 });

    // Navegar para Planos e Faturamento
    await page.goto(absoluteUrl('/superadmin/plans'));
    await expect(
      page.getByRole('heading', { name: /Planos/i }).first()
    ).toBeVisible();
  });
});
