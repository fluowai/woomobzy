import { test } from '@playwright/test';
import {
  attachRuntimeMonitor,
  expectNoRuntimeErrors,
  expectRoleShell,
  loginAsRole,
  missingRoleMessage,
  openBlockedRouteAndAssertRedirect,
  openSmokeNavigationAndAssert,
  type AuditRole,
  getRoleCredentials,
  roleConfigs,
} from './auth-audit.helpers';

const auditedRoles = Object.keys(roleConfigs) as AuditRole[];

for (const role of auditedRoles) {
  const { label } = roleConfigs[role];

  test.describe(`Onda 0 - smoke autenticado (${label})`, () => {
    test('entra com sucesso e carrega o shell do perfil correto', async ({
      page,
    }) => {
      test.skip(!getRoleCredentials(role), missingRoleMessage(role));

      const runtimeErrors = attachRuntimeMonitor(page);
      await loginAsRole(page, role);
      await expectRoleShell(page, role);
      await expectNoRuntimeErrors(runtimeErrors);
    });

    test('bloqueia a rota administrativa indevida e redireciona para o painel permitido', async ({
      page,
    }) => {
      test.skip(!getRoleCredentials(role), missingRoleMessage(role));

      const runtimeErrors = attachRuntimeMonitor(page);
      await loginAsRole(page, role);
      await openBlockedRouteAndAssertRedirect(page, role);
      await expectRoleShell(page, role);
      await expectNoRuntimeErrors(runtimeErrors);
    });

    test('mantém navegação básica do painel após autenticação', async ({
      page,
    }) => {
      test.skip(!getRoleCredentials(role), missingRoleMessage(role));

      const runtimeErrors = attachRuntimeMonitor(page);
      await loginAsRole(page, role);
      await openSmokeNavigationAndAssert(page, role);
      await expectRoleShell(page, role);
      await expectNoRuntimeErrors(runtimeErrors);
    });
  });
}
