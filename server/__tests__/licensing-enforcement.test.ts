import { afterEach, describe, expect, it } from 'vitest';
import {
  buildEnforcementDecision,
  clearEnforcementAuditThrottle,
  clearLicenseEnforcementCache,
  enforceLicenseAccess,
  resolveEnforcementMode,
  resolveLegacyTenantsFlag,
} from '../lib/licensing/enforcement.js';
import { LICENSE_STATES } from '../lib/licensing/policy.js';

type Row = Record<string, unknown>;

const NOW = Date.now();
const NOW_ISO = new Date(NOW).toISOString();
const FUTURE_ISO = new Date(NOW + 30 * 24 * 60 * 60 * 1000).toISOString();
const PAST_ISO = new Date(NOW - 30 * 24 * 60 * 60 * 1000).toISOString();
const RECENT_PAST_ISO = new Date(NOW - 24 * 60 * 60 * 1000).toISOString();

const ORIGINAL_ENV = { ...process.env };

let orgCounter = 0;
function nextOrg() {
  orgCounter += 1;
  return `org-enforcement-${orgCounter}`;
}

/**
 * Mock do Supabase com suporte às consultas usadas pelo enforcement:
 *  - licenses (select ... eq organization_id ... maybeSingle)
 *  - license_audit_events (select/eq/order/limit/maybeSingle + insert)
 *  - audit_logs (insert)
 * Contador por tabela permite verificar uso de cache (zero queries).
 */
function createMock(
  seed: {
    license?: Row | null;
    licenseError?: boolean;
  } = {}
) {
  const tables: Record<string, Row[]> = {
    licenses: seed.license ? [seed.license] : [],
    license_audit_events: [],
    audit_logs: [],
  };

  const state = {
    licenses: tables.licenses,
    audit: tables.license_audit_events,
    auditLogs: tables.audit_logs,
  };

  const calls: Record<string, number> = {
    licenses: 0,
    license_audit_events: 0,
    audit_logs: 0,
  };

  type Filters = { eq: Record<string, unknown> };

  function matches(row: Row, filters: Filters) {
    for (const [col, val] of Object.entries(filters.eq)) {
      if (String(row[col]) !== String(val)) return false;
    }
    return true;
  }

  function buildQuery(table: string) {
    const filters: Filters = { eq: {} };
    const q: any = {
      select() {
        return q;
      },
      eq(col: string, val: unknown) {
        filters.eq[col] = val;
        return q;
      },
      order() {
        return q;
      },
      limit() {
        return q;
      },
      async maybeSingle() {
        calls[table] += 1;
        if (table === 'licenses' && seed.licenseError) {
          return { data: null, error: { message: 'boom' } };
        }
        const rows = tables[table];
        return {
          data: rows.find((r) => matches(r, filters)) ?? null,
          error: null,
        };
      },
      insert(rows: Row[]) {
        const inserted = rows.map((row) => ({
          id: row.id || `${table}-${tables[table].length + 1}`,
          ...row,
          created_at: (row.created_at as string) || NOW_ISO,
        }));
        tables[table].push(...inserted);
        return {
          then(resolve: (v: { data: Row[]; error: null }) => void) {
            return Promise.resolve({ data: inserted, error: null }).then(
              resolve
            );
          },
        };
      },
    };
    return q;
  }

  return {
    state,
    calls,
    from(table: string) {
      if (!(table in tables))
        throw new Error(`Unexpected table in test: ${table}`);
      return buildQuery(table);
    },
  };
}

function baseLicense(patch: Row = {}) {
  return {
    id: 'lic-1',
    organization_id: 'org-x',
    license_key: null,
    plan_id: null,
    signing_key_id: null,
    status: 'active',
    edition: 'standard',
    max_installations: 1,
    grace_days: 0,
    blocking_policy: 'soft',
    issued_at: NOW_ISO,
    activated_at: NOW_ISO,
    expires_at: FUTURE_ISO,
    last_validated_at: null,
    metadata: {},
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    ...patch,
  };
}

function makeRes() {
  return {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}

interface TestLicenseState {
  state: string;
  code: string;
  degraded: boolean;
  message: string | null;
  expires_at: string | null;
  blocking_policy: string | null;
  edition: string | null;
}

interface TestReq {
  userRole?: string;
  isImpersonating?: boolean;
  orgId?: string | null;
  authUserId?: string;
  ip?: string;
  licenseState?: TestLicenseState;
}

function makeReq(patch: Record<string, unknown> = {}): TestReq {
  return {
    userRole: 'admin',
    isImpersonating: false,
    orgId: null,
    authUserId: 'user-1',
    ip: '203.0.113.10',
    ...patch,
  } as TestReq;
}

async function runMiddleware({
  mock,
  mode = 'soft',
  legacyTenants,
  req,
  res,
}: {
  mock: ReturnType<typeof createMock>;
  mode?: string;
  legacyTenants?: boolean;
  req: TestReq;
  res: ReturnType<typeof makeRes>;
}) {
  let nextCalled = false;
  const middleware = enforceLicenseAccess({
    supabase: mock as never,
    mode,
    legacyTenants,
  });
  await middleware(req as never, res as never, () => {
    nextCalled = true;
  });
  return nextCalled;
}

describe('license enforcement', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    clearEnforcementAuditThrottle();
  });

  describe('env parsing', () => {
    it('resolveEnforcementMode tem off como padrão e tolera valor inválido', () => {
      delete process.env.LICENSE_ENFORCEMENT;
      expect(resolveEnforcementMode()).toBe('off');
      process.env.LICENSE_ENFORCEMENT = 'HARD';
      expect(resolveEnforcementMode()).toBe('hard');
      process.env.LICENSE_ENFORCEMENT = 'nonsense';
      expect(resolveEnforcementMode()).toBe('off');
    });

    it('resolveLegacyTenantsFlag aceita on/true/1', () => {
      delete process.env.LICENSE_ENFORCEMENT_LEGACY_TENANTS;
      expect(resolveLegacyTenantsFlag()).toBe(false);
      for (const value of ['on', 'true', '1']) {
        process.env.LICENSE_ENFORCEMENT_LEGACY_TENANTS = value;
        expect(resolveLegacyTenantsFlag()).toBe(true);
      }
      process.env.LICENSE_ENFORCEMENT_LEGACY_TENANTS = 'off';
      expect(resolveLegacyTenantsFlag()).toBe(false);
    });
  });

  describe('modo off (fail-open total)', () => {
    it('nunca bloqueia, mesmo com licença blocked, e audita', async () => {
      const orgId = nextOrg();
      const mock = createMock({
        license: baseLicense({
          id: 'lic-off',
          organization_id: orgId,
          status: 'blocked',
        }),
      });
      const req = makeReq({ orgId, isImpersonating: false });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'off', req, res });

      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(req.licenseState).toMatchObject({
        state: LICENSE_STATES.BLOCKED,
        code: 'LICENSE_BLOCKED',
        degraded: true,
      });
      expect(mock.state.audit).toHaveLength(1);
      expect(mock.state.audit[0]?.action).toBe('license.enforcement.blocked');
    });

    it('no_license libera e registra license_missing_org em audit_logs', async () => {
      const orgId = nextOrg();
      const mock = createMock({ license: null });
      const req = makeReq({ orgId });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'off', req, res });

      expect(nextCalled).toBe(true);
      expect(req.licenseState).toMatchObject({
        state: LICENSE_STATES.NO_LICENSE,
        code: 'LICENSE_NOT_FOUND',
      });
      expect(mock.state.auditLogs).toHaveLength(1);
      expect(mock.state.auditLogs[0]?.action).toBe(
        'license.enforcement.no_license'
      );
    });
  });

  describe('modo soft', () => {
    it('bloqueia licença blocked com 403 LICENSE_BLOCKED', async () => {
      const orgId = nextOrg();
      const mock = createMock({
        license: baseLicense({
          id: 'lic-soft-blocked',
          organization_id: orgId,
          status: 'blocked',
        }),
      });
      const req = makeReq({ orgId });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'soft', req, res });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body).toMatchObject({
        code: 'LICENSE_BLOCKED',
        license: { state: 'blocked' },
      });
    });

    it('bloqueia licença revoked com 403 LICENSE_REVOKED', async () => {
      const orgId = nextOrg();
      const mock = createMock({
        license: baseLicense({
          id: 'lic-soft-revoked',
          organization_id: orgId,
          status: 'revoked',
        }),
      });
      const req = makeReq({ orgId });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'soft', req, res });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body).toMatchObject({ code: 'LICENSE_REVOKED' });
    });

    it('bloqueia licença suspended com 403 LICENSE_SUSPENDED', async () => {
      const orgId = nextOrg();
      const mock = createMock({
        license: baseLicense({
          id: 'lic-soft-suspended',
          organization_id: orgId,
          status: 'suspended',
        }),
      });
      const req = makeReq({ orgId });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'soft', req, res });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body).toMatchObject({ code: 'LICENSE_SUSPENDED' });
    });

    it('grace libera em modo degradado + auditoria', async () => {
      const orgId = nextOrg();
      const mock = createMock({
        license: baseLicense({
          id: 'lic-soft-grace',
          organization_id: orgId,
          status: 'active',
          blocking_policy: 'soft',
          grace_days: 3,
          expires_at: RECENT_PAST_ISO,
        }),
      });
      const req = makeReq({ orgId });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'soft', req, res });

      expect(nextCalled).toBe(true);
      expect(req.licenseState).toMatchObject({
        state: LICENSE_STATES.GRACE,
        degraded: true,
      });
      expect(mock.state.audit).toHaveLength(1);
    });

    it('expired soft libera em modo degradado + auditoria', async () => {
      const orgId = nextOrg();
      const mock = createMock({
        license: baseLicense({
          id: 'lic-soft-expired',
          organization_id: orgId,
          status: 'active',
          blocking_policy: 'soft',
          grace_days: 0,
          expires_at: PAST_ISO,
        }),
      });
      const req = makeReq({ orgId });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'soft', req, res });

      expect(nextCalled).toBe(true);
      expect(req.licenseState).toMatchObject({
        state: LICENSE_STATES.EXPIRED,
        degraded: true,
      });
      expect(mock.state.audit).toHaveLength(1);
    });

    it('expired com política hard vira 403 LICENSE_BLOCKED_HARD', async () => {
      const orgId = nextOrg();
      const mock = createMock({
        license: baseLicense({
          id: 'lic-soft-expired-hard',
          organization_id: orgId,
          status: 'active',
          blocking_policy: 'hard',
          grace_days: 0,
          expires_at: PAST_ISO,
        }),
      });
      const req = makeReq({ orgId });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'soft', req, res });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body).toMatchObject({ code: 'LICENSE_BLOCKED_HARD' });
    });

    it('no_license libera + audita (sem bloqueio no soft)', async () => {
      const orgId = nextOrg();
      const mock = createMock({ license: null });
      const req = makeReq({ orgId });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'soft', req, res });

      expect(nextCalled).toBe(true);
      expect(req.licenseState).toMatchObject({
        state: LICENSE_STATES.NO_LICENSE,
        degraded: false,
      });
      expect(mock.state.auditLogs).toHaveLength(1);
    });

    it('licença válida libera sem auditoria', async () => {
      const orgId = nextOrg();
      const mock = createMock({
        license: baseLicense({
          id: 'lic-soft-valid',
          organization_id: orgId,
          status: 'active',
          expires_at: FUTURE_ISO,
        }),
      });
      const req = makeReq({ orgId });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'soft', req, res });

      expect(nextCalled).toBe(true);
      expect(req.licenseState).toMatchObject({
        state: LICENSE_STATES.VALID,
        degraded: false,
      });
      expect(req.licenseState.expires_at).toBe(FUTURE_ISO);
      expect(mock.state.audit).toHaveLength(0);
    });
  });

  describe('modo hard', () => {
    it('no_license sem legacy_tenant bloqueia com 403 LICENSE_NOT_FOUND', async () => {
      const orgId = nextOrg();
      const mock = createMock({ license: null });
      const req = makeReq({ orgId });
      const res = makeRes();

      const nextCalled = await runMiddleware({
        mock,
        mode: 'hard',
        legacyTenants: false,
        req,
        res,
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body).toMatchObject({
        code: 'LICENSE_NOT_FOUND',
        license: { state: 'no_license' },
      });
    });

    it('no_license com legacy_tenant vira degradado (escape pré-rollout)', async () => {
      const orgId = nextOrg();
      const mock = createMock({ license: null });
      const req = makeReq({ orgId });
      const res = makeRes();

      const nextCalled = await runMiddleware({
        mock,
        mode: 'hard',
        legacyTenants: true,
        req,
        res,
      });

      expect(nextCalled).toBe(true);
      expect(req.licenseState).toMatchObject({
        state: LICENSE_STATES.NO_LICENSE,
        degraded: true,
      });
      expect(mock.state.auditLogs).toHaveLength(1);
    });
  });

  describe('isenções e impersonação', () => {
    it('superadmin sem org é isento e não consulta licença', async () => {
      const mock = createMock({ license: null });
      const req = makeReq({
        userRole: 'superadmin',
        isImpersonating: false,
        orgId: null,
      });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'hard', req, res });

      expect(nextCalled).toBe(true);
      expect(mock.calls.licenses).toBe(0);
    });

    it('superadmin com org (control plane) é isento mesmo em modo hard', async () => {
      const mock = createMock({ license: null });
      const req = makeReq({
        userRole: 'superadmin',
        isImpersonating: false,
        orgId: 'org-reseller',
      });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'hard', req, res });

      expect(nextCalled).toBe(true);
      expect(mock.calls.licenses).toBe(0);
    });

    it('perfil sem org é isento (onboarding/first-login)', async () => {
      const mock = createMock({ license: null });
      const req = makeReq({
        userRole: 'user',
        isImpersonating: false,
        orgId: null,
      });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'hard', req, res });

      expect(nextCalled).toBe(true);
      expect(mock.calls.licenses).toBe(0);
    });

    it('superadmin impersonando usa a organização alvo', async () => {
      const orgId = nextOrg();
      const mock = createMock({
        license: baseLicense({
          id: 'lic-target',
          organization_id: orgId,
          status: 'revoked',
        }),
      });
      const req = makeReq({
        userRole: 'superadmin',
        isImpersonating: true,
        orgId,
      });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'soft', req, res });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body).toMatchObject({ code: 'LICENSE_REVOKED' });
      expect(mock.calls.licenses).toBe(1);
    });
  });

  describe('resiliência', () => {
    it('erro de banco nunca bloqueia (fail-open) e marca enforcement_error', async () => {
      const orgId = nextOrg();
      const mock = createMock({ license: null, licenseError: true });
      const req = makeReq({ orgId });
      const res = makeRes();

      const nextCalled = await runMiddleware({ mock, mode: 'hard', req, res });

      expect(nextCalled).toBe(true);
      expect(req.licenseState).toMatchObject({
        code: 'ENFORCEMENT_ERROR',
      });
    });

    it('segunda chamada usa cache (não consulta o banco)', async () => {
      const orgId = nextOrg();
      const mock = createMock({
        license: baseLicense({
          id: 'lic-cache',
          organization_id: orgId,
          status: 'active',
        }),
      });
      const req = makeReq({ orgId });
      const res = makeRes();

      await runMiddleware({ mock, mode: 'soft', req, res });
      await runMiddleware({ mock, mode: 'soft', req, res });

      expect(mock.calls.licenses).toBe(1);
    });

    it('clearLicenseEnforcementCache força nova consulta', async () => {
      const orgId = nextOrg();
      const mock = createMock({
        license: baseLicense({
          id: 'lic-cache-clear',
          organization_id: orgId,
          status: 'active',
        }),
      });
      const req = makeReq({ orgId });
      const res = makeRes();

      await runMiddleware({ mock, mode: 'soft', req, res });
      clearLicenseEnforcementCache(orgId);
      await runMiddleware({ mock, mode: 'soft', req, res });

      expect(mock.calls.licenses).toBe(2);
    });
  });

  describe('buildEnforcementDecision', () => {
    it('licença nula em modo off libera sem mensagem', () => {
      const decision = buildEnforcementDecision({
        mode: 'off',
        license: null,
        legacyTenants: false,
      });
      expect(decision.allow).toBe(true);
      expect(decision.state).toBe(LICENSE_STATES.NO_LICENSE);
    });

    it('blocked em modo off degrada; em soft bloqueia', () => {
      const license = baseLicense({ status: 'blocked' });
      const off = buildEnforcementDecision({
        mode: 'off',
        license,
        legacyTenants: false,
      });
      const soft = buildEnforcementDecision({
        mode: 'soft',
        license,
        legacyTenants: false,
      });
      expect(off.allow).toBe(true);
      expect(off.degraded).toBe(true);
      expect(soft.allow).toBe(false);
      expect(soft.code).toBe('LICENSE_BLOCKED');
    });
  });
});
