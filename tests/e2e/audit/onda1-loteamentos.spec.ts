import { test, expect } from '@playwright/test';
import { loginAsRole, absoluteUrl, attachRuntimeMonitor } from './auth-audit.helpers';

test.describe('Onda 1 - Módulo Urbano: Loteamentos', () => {

  test('Deve criar, listar e persistir um Loteamento', async ({ page }) => {
    test.setTimeout(45000); 
    const errors = attachRuntimeMonitor(page);

    // Add network request logger to see what fails
    page.on('requestfailed', request => {
      console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    // 1. Logar como admin urbano
    await loginAsRole(page, 'urbanAdmin');

    // 2. Navegar para Empreendimentos (Loteamentos)
    // Em vez de page.goto, usamos click no menu (cobrindo mobile e desktop)
    const isMobile = await page.evaluate(() => window.innerWidth < 768);
    if (isMobile) {
      await page.getByRole('button', { name: /abrir menu/i, exact: false }).click().catch(() => {});
    }
    await page.getByRole('link', { name: /Loteamentos|Empreendimentos/i }).first().click();
    await page.waitForURL(/\/urban\/loteamentos/);

    // 3. Abrir modal de Novo Loteamento
    await page.getByRole('button', { name: /Novo Loteamento/i }).click();

    // 4. Preencher formulário
    const uniqueName = `Loteamento E2E ${Date.now()}`;
    await page.getByPlaceholder('Ex: Residencial Parque das Águas').fill(uniqueName);
    
    // We will use more robust selectors instead of nth(1)
    // Actually the labels are "Cidade", "Estado (UF)", "Matrícula Mãe / Registro", "Total de Lotes"
    // Since input has no aria-label, we can rely on traversing from the label, but in playwright it's easier to just use xpath or css if needed. 
    // Let's use evaluate or just simple Tab navigation, or nth.
    // The inputs are: [0: nome, 1: cidade, 2: estado, 3: matricula, 4: total_lotes, 5: infraestrutura]
    const modal = page.locator('.fixed.inset-0 .bg-white'); // the modal
    const inputs = modal.locator('input');
    
    await inputs.nth(1).fill('São Paulo');
    await inputs.nth(2).fill('SP');
    await inputs.nth(3).fill('MAT-123456');
    await inputs.nth(4).fill('50');
    await inputs.nth(5).fill('10');

    // 5. Salvar
    await page.getByRole('button', { name: /Salvar Empreendimento/i }).click();

    // 6. Verificar se apareceu na lista
    await expect(page.locator('text=' + uniqueName)).toBeVisible();
    
    // 7. Clicar no botão de mapa/lotes para garantir que está acessível
    const row = page.locator('tr', { hasText: uniqueName });
    await row.getByRole('link', { name: /Mapa \/ Lotes/i }).click();
    
    await expect(page).toHaveURL(/\/urban\/loteamentos\/.+/);
  });

});
