import { test, expect } from '@playwright/test';
import { 
  loginAsRole, 
  expectRoleShell, 
  openBlockedRouteAndAssertRedirect,
  absoluteUrl
} from './auth-audit.helpers';

test.describe('Onda 0 - Autenticação, Proteção e Roteamento', () => {

  test('Bloqueio anônimo redireciona para login', async ({ page }) => {
    await page.goto(absoluteUrl('/urbano'));
    await page.waitForURL(/.*\/login/);
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('Admin Urbano: Login, Redirecionamento correto e Bloqueio cruzado', async ({ page }) => {
    // Requires IMOBZY_E2E_URBAN_ADMIN_EMAIL etc to be set in .env
    await loginAsRole(page, 'urbanAdmin');
    await expectRoleShell(page, 'urbanAdmin');
    
    // Tenta acessar painel super admin
    await openBlockedRouteAndAssertRedirect(page, 'urbanAdmin'); // which tries to go to /megaadmin by default in helpers
    // Tenta acessar painel rural
    await page.goto(absoluteUrl('/rural'));
    await page.waitForURL(/.*\/urban/);
    await expect(page).toHaveURL(/.*\/urban/);
    
    // Logout programaticamente
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(absoluteUrl('/login'));
    await page.waitForURL(/.*\/login/);
  });

  test('Admin Rural: Login, Redirecionamento correto e Bloqueio cruzado', async ({ page }) => {
    await loginAsRole(page, 'ruralAdmin');
    await expectRoleShell(page, 'ruralAdmin');
    
    // Tenta acessar painel urbano
    await page.goto(absoluteUrl('/urban'));
    await page.waitForURL(/.*\/rural/);
    await expect(page).toHaveURL(/.*\/rural/);
  });

  test('Super Admin: Painel Exclusivo', async ({ page }) => {
    await loginAsRole(page, 'superAdmin');
    await expectRoleShell(page, 'superAdmin');
  });

  test('Mega Admin: Painel Exclusivo', async ({ page }) => {
    await loginAsRole(page, 'megaAdmin');
    await expectRoleShell(page, 'megaAdmin');
  });
});
