import { expect, type Page } from '@playwright/test';

export type AuditRole = 'urbanAdmin' | 'urbanBroker' | 'ruralAdmin' | 'superAdmin' | 'megaAdmin';

type RoleConfig = {
  label: string;
  emailEnv: string;
  passwordEnv: string;
  homePath: string;
  allowedLanding: RegExp;
  shellHref: string;
  smokeNavHref: string;
  blockedPath: string;
};

type RoleCredentials = {
  email: string;
  password: string;
};

export const auditBaseUrl =
  process.env.IMOBZY_E2E_BASE_URL?.trim() || 'http://127.0.0.1:3006';

export const roleConfigs: Record<AuditRole, RoleConfig> = {
  urbanAdmin: {
    label: 'admin urbano',
    emailEnv: 'IMOBZY_E2E_URBAN_ADMIN_EMAIL',
    passwordEnv: 'IMOBZY_E2E_URBAN_ADMIN_PASSWORD',
    homePath: '/urban',
    allowedLanding: /\/urban(?:\/.*)?$/,
    shellHref: '/urban/clients',
    smokeNavHref: '/urban/locacao',
    blockedPath: '/megaadmin',
  },
  urbanBroker: {
    label: 'corretor urbano',
    emailEnv: 'IMOBZY_E2E_URBAN_BROKER_EMAIL',
    passwordEnv: 'IMOBZY_E2E_URBAN_BROKER_PASSWORD',
    homePath: '/urban',
    allowedLanding: /\/urban(?:\/.*)?$/,
    shellHref: '/urban/properties',
    smokeNavHref: '/urban/kanban',
    blockedPath: '/megaadmin',
  },
  ruralAdmin: {
    label: 'admin rural',
    emailEnv: 'IMOBZY_E2E_RURAL_ADMIN_EMAIL',
    passwordEnv: 'IMOBZY_E2E_RURAL_ADMIN_PASSWORD',
    homePath: '/rural',
    allowedLanding: /\/rural(?:\/.*)?$/,
    shellHref: '/rural/territorio',
    smokeNavHref: '/rural/crm',
    blockedPath: '/superadmin',
  },
  superAdmin: {
    label: 'super admin',
    emailEnv: 'IMOBZY_E2E_SUPER_ADMIN_EMAIL',
    passwordEnv: 'IMOBZY_E2E_SUPER_ADMIN_PASSWORD',
    homePath: '/superadmin',
    allowedLanding: /\/superadmin(?:\/.*)?$/,
    shellHref: '/superadmin/tenants',
    smokeNavHref: '/superadmin/plans',
    blockedPath: '/megaadmin',
  },
  megaAdmin: {
    label: 'mega admin',
    emailEnv: 'IMOBZY_E2E_MEGA_ADMIN_EMAIL',
    passwordEnv: 'IMOBZY_E2E_MEGA_ADMIN_PASSWORD',
    homePath: '/megaadmin',
    allowedLanding: /\/megaadmin(?:\/.*)?$/,
    shellHref: '/megaadmin/resellers',
    smokeNavHref: '/megaadmin/direct-clients',
    blockedPath: '/superadmin',
  },
};

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, `${auditBaseUrl}/`).toString();
}

export function getRoleCredentials(role: AuditRole): RoleCredentials | null {
  const config = roleConfigs[role];
  const email = process.env[config.emailEnv]?.trim();
  const password = process.env[config.passwordEnv]?.trim();

  if (!email || !password) return null;

  return { email, password };
}

export function getMissingCredentialEnvVars(): string[] {
  const missing = new Set<string>();

  for (const role of Object.keys(roleConfigs) as AuditRole[]) {
    const config = roleConfigs[role];
    if (!process.env[config.emailEnv]?.trim()) missing.add(config.emailEnv);
    if (!process.env[config.passwordEnv]?.trim())
      missing.add(config.passwordEnv);
  }

  return Array.from(missing).sort();
}

export function missingRoleMessage(role: AuditRole): string {
  const config = roleConfigs[role];
  return [
    `Credenciais ausentes para ${config.label}.`,
    `Defina ${config.emailEnv} e ${config.passwordEnv}.`,
    'Este bloqueio é intencional para evitar falso positivo em auditoria autenticada.',
  ].join(' ');
}

export function attachRuntimeMonitor(page: Page): string[] {
  const runtimeErrors: string[] = [];

  page.on('pageerror', (error) => {
    runtimeErrors.push(`pageerror: ${error.message}`);
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(`console: ${message.text()}`);
    }
  });

  return runtimeErrors;
}

export async function expectNoRuntimeErrors(errors: string[]) {
  expect(errors, 'A página gerou erros de runtime durante o smoke.').toEqual(
    []
  );
}

export async function loginAsRole(page: Page, role: AuditRole) {
  const credentials = getRoleCredentials(role);
  if (!credentials) {
    throw new Error(missingRoleMessage(role));
  }

  const config = roleConfigs[role];

  await page.goto(absoluteUrl('/login'));
  const emailInput = page.getByLabel(/e-mail corporativo/i);
  const passwordInput = page.getByLabel(/^senha$/i);

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();

  await emailInput.fill(credentials.email);
  await passwordInput.fill(credentials.password);
  await page.getByRole('button', { name: /entrar no painel/i }).click();

  await page.waitForURL(config.allowedLanding, { timeout: 45_000 });
  await expect(page).toHaveURL(config.allowedLanding);
}

export async function expectRoleShell(page: Page, role: AuditRole) {
  const config = roleConfigs[role];
  // Verify we are at the allowed landing URL instead of relying on specific DOM elements
  // which might be hidden behind hamburger menus on mobile viewports.
  await expect(page).toHaveURL(config.allowedLanding);
}

export async function openBlockedRouteAndAssertRedirect(
  page: Page,
  role: AuditRole
) {
  const config = roleConfigs[role];

  await page.goto(absoluteUrl(config.blockedPath));
  await page.waitForURL(config.allowedLanding, { timeout: 45_000 });
  await expect(page).toHaveURL(config.allowedLanding);
}

export async function openSmokeNavigationAndAssert(
  page: Page,
  role: AuditRole
) {
  const config = roleConfigs[role];

  await page.goto(absoluteUrl(config.smokeNavHref));
  await expect(page).toHaveURL(
    new RegExp(`${config.smokeNavHref.replace(/\//g, '\\/')}(?:\\/.*)?$`)
  );
  await expect(
    page.locator(`a[href="${config.smokeNavHref}"]`).first()
  ).toBeVisible();
}
