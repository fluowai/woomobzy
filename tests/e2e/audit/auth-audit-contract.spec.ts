import { expect, test } from '@playwright/test';
import {
  absoluteUrl,
  getMissingCredentialEnvVars,
  roleConfigs,
} from './auth-audit.helpers';

test.describe('Onda 0 - contrato de auditoria autenticada', () => {
  test('falha de forma visível quando as credenciais de auditoria não foram configuradas', async () => {
    test.skip(
      test.info().project.name !== 'chromium',
      'A falha de contrato precisa aparecer uma única vez no projeto principal.'
    );

    const missing = getMissingCredentialEnvVars();

    expect(
      missing,
      [
        'Credenciais de auditoria ausentes.',
        'Defina as variáveis abaixo antes de executar a auditoria autenticada:',
        missing.join(', ') || '(nenhuma ausente)',
      ].join('\n')
    ).toEqual([]);
  });

  for (const [roleKey, config] of Object.entries(roleConfigs)) {
    test(`bloqueia usuário anônimo em ${config.homePath} (${roleKey}) e exibe o login`, async ({
      page,
    }) => {
      await page.goto(absoluteUrl(config.homePath));
      await expect(page.getByLabel(/e-mail corporativo/i)).toBeVisible();
      await expect(page.getByLabel(/^senha$/i)).toBeVisible();
      await expect(
        page.getByRole('button', { name: /entrar no painel/i })
      ).toBeVisible();
    });
  }
});
