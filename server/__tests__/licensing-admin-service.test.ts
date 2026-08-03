import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  generateKeyPair,
  verifyLicenseKey,
} from '../lib/licensing/crypto.js';
import {
  createLicense,
  bindDomainToLicenseViaSetupToken,
  getLicenseDetail,
  LicenseAdminError,
  listLicenses,
  provisionLicenseForOrganization,
  reissueLicenseKey,
  revokeInstallation,
  setLicenseStatus,
  updateLicense,
} from '../lib/licensing/admin-service.js';
import { createSetupToken } from '../lib/licensing/setup-token.js';

type Row = Record<string, unknown>;

const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const NOW_ISO = new Date(NOW).toISOString();

let keyPair: ReturnType<typeof generateKeyPair>;
let orgId: string;
let planId: string;

function createMock(seed: {
  licenses?: Row[];
  installations?: Row[];
  organizations?: Row[];
  plans?: Row[];
  domains?: Row[];
  orgDomains?: Row[];
  entitlements?: Row[];
} = {}) {
  const state: {
    licenses: Row[];
    installations: Row[];
    organizations: Row[];
    plans: Row[];
    domains: Row[];
    orgDomains: Row[];
    entitlements: Row[];
    heartbeats: Row[];
    audit: Row[];
    auditLogs: Row[];
  } = {
    licenses: seed.licenses || [],
    installations: seed.installations || [],
    organizations: seed.organizations || [],
    plans: seed.plans || [],
    domains: seed.domains || [],
    orgDomains: seed.orgDomains || [],
    entitlements: seed.entitlements || [],
    heartbeats: [],
    audit: [],
    auditLogs: [],
  };

  const tables: Record<string, Row[]> = {
    licenses: state.licenses,
    license_installations: state.installations,
    organizations: state.organizations,
    plans: state.plans,
    license_domains: state.domains,
    domains: state.orgDomains,
    license_entitlements: state.entitlements,
    license_heartbeats: state.heartbeats,
    license_audit_events: state.audit,
    audit_logs: state.auditLogs,
  };

  type Filters = {
    eq: Record<string, unknown>;
    in: Record<string, unknown[]>;
    is: Record<string, unknown>;
    ilike: Record<string, string>;
    or: Array<{ col: string; val: unknown }>;
  };

  function normalizePattern(pattern: string) {
    return String(pattern).replace(/%/g, '').toLowerCase();
  }

  function matches(row: Row, filters: Filters) {
    for (const [col, val] of Object.entries(filters.eq)) {
      if (String(row[col]) !== String(val)) return false;
    }
    for (const [col, vals] of Object.entries(filters.in)) {
      if (!vals.includes(row[col])) return false;
    }
    for (const [col, val] of Object.entries(filters.is)) {
      if (val === null) {
        if (row[col] !== null && row[col] !== undefined) return false;
      } else if (row[col] !== val) {
        return false;
      }
    }
    for (const [col, pattern] of Object.entries(filters.ilike)) {
      if (!String(row[col] || '').toLowerCase().includes(normalizePattern(pattern))) {
        return false;
      }
    }
    if (filters.or.length) {
      const orMatch = filters.or.some(
        (o) => String(row[o.col]) === String(o.val)
      );
      if (!orMatch) return false;
    }
    return true;
  }

  function filtered(table: string, filters: Filters, q: any) {
    let rows = tables[table].filter((r) => matches(r, filters));
    if (q.orderCol) {
      rows = [...rows].sort((a, b) => {
        const av = String(a[q.orderCol] || '');
        const bv = String(b[q.orderCol] || '');
        return q.ascending ? (av < bv ? -1 : av > bv ? 1 : 0) : av < bv ? 1 : -1;
      });
    }
    if (q.rangeStart !== undefined && q.rangeEnd !== undefined) {
      rows = rows.slice(q.rangeStart, q.rangeEnd + 1);
    } else if (q.limitN) {
      rows = rows.slice(0, q.limitN);
    }
    return rows;
  }

  function buildQuery(table: string) {
    const filters: Filters = { eq: {}, in: {}, is: {}, ilike: {}, or: [] };
    const q: any = {
      select(columns: unknown, opts?: { count?: boolean; head?: boolean }) {
        q.countMode = !!opts?.count;
        q.head = !!opts?.head;
        void columns;
        return q;
      },
      eq(col: string, val: unknown) {
        filters.eq[col] = val;
        return q;
      },
      in(col: string, vals: unknown[]) {
        filters.in[col] = vals;
        return q;
      },
      is(col: string, val: unknown) {
        filters.is[col] = val;
        return q;
      },
      ilike(col: string, pattern: string) {
        filters.ilike[col] = pattern;
        return q;
      },
      or(expr: string) {
        for (const group of String(expr).split(',')) {
          const [col, val] = group.split('.eq.');
          filters.or.push({ col, val });
        }
        return q;
      },
      limit(n: number) {
        q.limitN = n;
        return q;
      },
      range(start: number, end: number) {
        q.rangeStart = start;
        q.rangeEnd = end;
        return q;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        q.orderCol = col;
        q.ascending = opts?.ascending !== false;
        return q;
      },
      then(resolve: (v: any) => void) {
        const all = tables[table].filter((r) => matches(r, filters));
        const rows = filtered(table, filters, q);
        const total = all.length;
        if (q.head) {
          return Promise.resolve({ data: null, count: total, error: null }).then(
            resolve
          );
        }
        if (q.countMode) {
          return Promise.resolve({ data: rows, count: total, error: null }).then(
            resolve
          );
        }
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
      async maybeSingle() {
        const rows = filtered(table, filters, q);
        return { data: rows[0] ?? null, error: null };
      },
      async single() {
        const rows = filtered(table, filters, q);
        return { data: rows[0] ?? null, error: null };
      },
      insert(rows: Row[]) {
        const inserted = rows.map((row) => {
          const full: Row = {
            id: String(row.id) || `${table}-${tables[table].length + 1}`,
            ...row,
            created_at: (row.created_at as string) || NOW_ISO,
          };
          tables[table].push(full);
          return full;
        });
        return {
          select() {
            return {
              async single() {
                return { data: inserted[0] ?? null, error: null };
              },
            };
          },
          then(resolve: (v: { data: Row[]; error: null }) => void) {
            return Promise.resolve({ data: inserted, error: null }).then(resolve);
          },
        };
      },
      upsert(rows: Row[], opts?: { onConflict?: string }) {
        const list = (Array.isArray(rows) ? rows : [rows]) as Row[];
        const conflictCols = (opts?.onConflict || 'id')
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean);
        const target = tables[table];
        const inserted = list.map((row) => {
          const full: Row = {
            id: String(row.id) || `${table}-${tables[table].length + 1}`,
            ...row,
            created_at: (row.created_at as string) || NOW_ISO,
          };
          for (const existing of [...target]) {
            if (conflictCols.every((col) => existing[col] === full[col])) {
              target.splice(target.indexOf(existing), 1);
            }
          }
          target.push(full);
          return full;
        });
        return {
          select() {
            return {
              async single() {
                return { data: inserted[0] ?? null, error: null };
              },
            };
          },
          then(resolve: (v: { data: Row[]; error: null }) => void) {
            return Promise.resolve({ data: inserted, error: null }).then(resolve);
          },
        };
      },
      delete() {
        return {
          eq(col: string, val: unknown) {
            return {
              async then(resolve: (v: { data: Row[]; error: null }) => void) {
                const target = tables[table];
                const removed = target.filter(
                  (r) => String(r[col]) === String(val)
                );
                for (const row of removed) {
                  target.splice(target.indexOf(row), 1);
                }
                return Promise.resolve({ data: removed, error: null }).then(
                  resolve
                );
              },
            };
          },
        };
      },
      update(patch: Row) {
        return {
          eq(col: string, val: unknown) {
            const nextFilters = {
              ...filters,
              eq: { ...filters.eq, [col]: val },
            };
            return {
              select() {
                return {
                  async single() {
                    const row = tables[table].find((r) =>
                      matches(r, nextFilters)
                    );
                    if (!row) return { data: null, error: null };
                    Object.assign(row, patch);
                    return { data: row, error: null };
                  },
                };
              },
              then(resolve: (v: { data: Row[]; error: null }) => void) {
                const rows = tables[table].filter((r) => matches(r, nextFilters));
                rows.forEach((r) => Object.assign(r, patch));
                return Promise.resolve({ data: rows, error: null }).then(resolve);
              },
            };
          },
        };
      },
    };
    return q;
  }

  return {
    state,
    from(table: string) {
      if (!tables[table]) throw new Error(`Unexpected table in test: ${table}`);
      return buildQuery(table);
    },
  };
}

function baseLicense(patch: Row = {}) {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    organization_id: orgId,
    license_key: 'WOLK1.PENDING.pending',
    plan_id: planId,
    signing_key_id: null,
    status: 'draft',
    edition: 'standard',
    max_installations: 1,
    grace_days: 3,
    blocking_policy: 'soft',
    issued_at: NOW_ISO,
    activated_at: null,
    expires_at: null,
    last_validated_at: null,
    metadata: {},
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    ...patch,
  };
}

describe('license admin service', () => {
  beforeEach(() => {
    keyPair = generateKeyPair();
    process.env.LICENSE_SIGNING_PRIVATE_KEY = keyPair.privateKeyPem;
    process.env.LICENSE_SIGNING_PUBLIC_KEY = keyPair.publicKeyPem;
    orgId = '11111111-1111-4111-8111-111111111111';
    planId = '22222222-2222-4222-8222-222222222222';
  });

  afterEach(() => {
    delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
    delete process.env.LICENSE_SIGNING_PUBLIC_KEY;
  });

  const context = {
    actorId: '99999999-9999-4999-8999-999999999999',
    ipAddress: '203.0.113.1',
    now: NOW,
  };

  describe('listLicenses', () => {
    it('returns licenses enriched with organization, plan and installation counts', async () => {
      const mock = createMock({
        licenses: [baseLicense({ id: 'lic-1', license_key: 'WOLK1.abc.def' })],
        organizations: [
          { id: orgId, name: 'Imob Empresa', slug: 'imob-empresa' },
        ],
        plans: [{ id: planId, name: 'Pro' }],
        installations: [
          {
            id: 'inst-1',
            license_id: 'lic-1',
            status: 'active',
            last_heartbeat_at: NOW_ISO,
          },
          {
            id: 'inst-2',
            license_id: 'lic-1',
            status: 'blocked',
            last_heartbeat_at: null,
          },
        ],
      });

      const result = await listLicenses(mock as never, {});
      expect(result.total).toBe(1);
      expect(result.licenses[0]).toMatchObject({
        organization_name: 'Imob Empresa',
        plan_name: 'Pro',
        active_installations: 1,
        total_installations: 2,
        last_heartbeat_at: NOW_ISO,
      });
    });

    it('filters by status and applies pagination', async () => {
      const mock = createMock({
        licenses: [
          baseLicense({ id: 'lic-1', status: 'active' }),
          baseLicense({ id: 'lic-2', status: 'blocked' }),
          baseLicense({ id: 'lic-3', status: 'draft' }),
        ],
      });

      const result = await listLicenses(mock as never, { status: 'blocked' });
      expect(result.total).toBe(1);
      expect(result.licenses[0].id).toBe('lic-2');

      const page = await listLicenses(mock as never, { limit: 2, offset: 0 });
      expect(page.licenses).toHaveLength(2);
    });

    it('rejects an invalid status', async () => {
      const mock = createMock({});
      await expect(
        listLicenses(mock as never, { status: 'nope' })
      ).rejects.toMatchObject({ code: 'LICENSE_INVALID_STATUS', status: 400 });
    });
  });

  describe('getLicenseDetail', () => {
    it('returns the license with all related collections', async () => {
      const licenseId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const mock = createMock({
        licenses: [baseLicense({ id: licenseId, status: 'active' })],
        organizations: [{ id: orgId, name: 'Imob Empresa' }],
        installations: [
          { id: 'inst-1', license_id: licenseId, status: 'active' },
        ],
        domains: [{ id: 'dom-1', license_id: licenseId, domain: 'imob.com.br' }],
        entitlements: [
          {
            id: 'ent-1',
            license_id: licenseId,
            key: 'properties_limit',
            value: 500,
          },
        ],
      });

      const detail = await getLicenseDetail(mock as never, licenseId);
      expect(detail.license.status).toBe('active');
      expect(detail.organization.name).toBe('Imob Empresa');
      expect(detail.installations).toHaveLength(1);
      expect(detail.domains).toHaveLength(1);
      expect(detail.entitlements[0].key).toBe('properties_limit');
      expect(detail.heartbeats).toEqual([]);
      expect(detail.auditEvents).toEqual([]);
    });

    it('throws 404 for an unknown license', async () => {
      const mock = createMock({});
      await expect(
        getLicenseDetail(mock as never, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
      ).rejects.toMatchObject({ code: 'LICENSE_NOT_FOUND', status: 404 });
    });
  });

  describe('createLicense', () => {
    it('creates a signed WOLK1 key, seeds entitlements and writes audit', async () => {
      const mock = createMock({
        organizations: [{ id: orgId, name: 'Imob Empresa' }],
        plans: [
          {
            id: planId,
            name: 'Pro',
            features: { lead_management: true },
            limits: { properties_limit: 500 },
          },
        ],
      });

      const result = await createLicense(
        mock as never,
        {
          organization_id: orgId,
          plan_id: planId,
          edition: 'pro',
          max_installations: 3,
          grace_days: 7,
          blocking_policy: 'soft',
          expires_at: '2027-01-01T00:00:00.000Z',
          metadata: { contract: 'w-001' },
        },
        context
      );

      expect(result.licenseKey).toMatch(/^WOLK1\./);
      const payload = verifyLicenseKey(result.licenseKey, keyPair.publicKeyPem);
      expect(payload.licenseId).toBe(result.license.id);
      expect(payload.edition).toBe('pro');

      expect(mock.state.licenses).toHaveLength(1);
      const created = mock.state.licenses[0];
      expect(created.license_key).toBe(result.licenseKey);
      expect(created.status).toBe('draft');
      expect(created.max_installations).toBe(3);
      expect(created.signing_key_id).toBeTruthy();

      expect(mock.state.entitlements).toHaveLength(2);
      const keys = mock.state.entitlements.map((e) => e.key);
      expect(keys).toContain('lead_management');
      expect(keys).toContain('properties_limit');

      expect(mock.state.audit).toHaveLength(1);
      expect(mock.state.audit[0].action).toBe('license.created');
      expect(mock.state.auditLogs).toHaveLength(1);
      expect(mock.state.auditLogs[0].action).toBe('license.created');
    });

    it('rejects an organization that already has a license', async () => {
      const mock = createMock({
        organizations: [{ id: orgId, name: 'Imob Empresa' }],
        licenses: [baseLicense()],
      });

      await expect(
        createLicense(mock as never, { organization_id: orgId }, context)
      ).rejects.toMatchObject({ code: 'LICENSE_ALREADY_EXISTS', status: 409 });
    });

    it('rejects an unknown organization', async () => {
      const mock = createMock({});
      await expect(
        createLicense(mock as never, { organization_id: orgId }, context)
      ).rejects.toMatchObject({ code: 'ORG_NOT_FOUND', status: 404 });
    });

    it('rejects an invalid edition', async () => {
      const mock = createMock({
        organizations: [{ id: orgId, name: 'Imob Empresa' }],
      });
      await expect(
        createLicense(mock as never, { organization_id: orgId, edition: 'free' }, context)
      ).rejects.toMatchObject({ code: 'LICENSE_INVALID_EDITION', status: 400 });
    });
  });

  describe('updateLicense', () => {
    it('updates editable fields and writes audit', async () => {
      const mock = createMock({ licenses: [baseLicense()] });

      const updated = await updateLicense(
        mock as never,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        { edition: 'enterprise', max_installations: 10 },
        context
      );

      expect(updated.edition).toBe('enterprise');
      expect(updated.max_installations).toBe(10);
      expect(mock.state.audit).toHaveLength(1);
      expect(mock.state.audit[0].action).toBe('license.updated');
    });

    it('rejects an invalid edition', async () => {
      const mock = createMock({ licenses: [baseLicense()] });
      await expect(
        updateLicense(
          mock as never,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          { edition: 'free' },
          context
        )
      ).rejects.toMatchObject({ code: 'LICENSE_INVALID_EDITION', status: 400 });
    });
  });

  describe('setLicenseStatus', () => {
    it('activates a draft license and sets activated_at', async () => {
      const mock = createMock({ licenses: [baseLicense()] });
      const updated = await setLicenseStatus(
        mock as never,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'activate',
        context
      );
      expect(updated.status).toBe('active');
      expect(updated.activated_at).toBe(NOW_ISO);
      expect(mock.state.audit[0].action).toBe('license.activated');
    });

    it('blocks a license and revokes its installations', async () => {
      const mock = createMock({
        licenses: [baseLicense({ status: 'active' })],
        installations: [
          {
            id: 'inst-1',
            license_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            status: 'active',
          },
        ],
      });

      const updated = await setLicenseStatus(
        mock as never,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'block',
        context
      );
      expect(updated.status).toBe('blocked');
      expect(mock.state.installations[0].status).toBe('blocked');
      expect(mock.state.audit[0].action).toBe('license.blocked');
      expect(mock.state.audit[0].severity).toBe('critical');
    });

    it('unblocks a blocked license back to active', async () => {
      const mock = createMock({ licenses: [baseLicense({ status: 'blocked' })] });
      const updated = await setLicenseStatus(
        mock as never,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'unblock',
        context
      );
      expect(updated.status).toBe('active');
      expect(mock.state.audit[0].action).toBe('license.unblocked');
    });

    it('rejects activating a blocked license', async () => {
      const mock = createMock({ licenses: [baseLicense({ status: 'blocked' })] });
      await expect(
        setLicenseStatus(
          mock as never,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          'activate',
          context
        )
      ).rejects.toMatchObject({ code: 'LICENSE_STATUS_TRANSITION', status: 409 });
    });
  });

  describe('revokeInstallation', () => {
    it('revokes a single installation and writes audit', async () => {
      const licenseId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const installationId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
      const mock = createMock({
        licenses: [baseLicense({ id: licenseId, status: 'active' })],
        installations: [
          {
            id: installationId,
            license_id: licenseId,
            installation_fingerprint: 'fp-1',
            status: 'active',
          },
        ],
      });

      const updated = await revokeInstallation(
        mock as never,
        licenseId,
        installationId,
        context
      );
      expect(updated.status).toBe('revoked');
      expect(updated.revoked_at).toBe(NOW_ISO);
      expect(mock.state.audit[0].action).toBe('license.installation_revoked');
    });
  });

  describe('reissueLicenseKey', () => {
    it('issues a new key and writes audit', async () => {
      const mock = createMock({ licenses: [baseLicense()] });
      const originalKey = mock.state.licenses[0].license_key;

      const result = await reissueLicenseKey(
        mock as never,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        context
      );

      expect(result.licenseKey).not.toBe(originalKey);
      expect(result.licenseKey).toMatch(/^WOLK1\./);
      const payload = verifyLicenseKey(result.licenseKey, keyPair.publicKeyPem);
      expect(payload.licenseId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      expect(mock.state.audit[0].action).toBe('license.key_reissued');
    });
  });

  describe('provisionLicenseForOrganization', () => {
    it('provisions an active license and a setup token', async () => {
      const mock = createMock({
        organizations: [{ id: orgId, name: 'Imob Empresa' }],
      });

      const result = await provisionLicenseForOrganization(
        mock as never,
        {
          organization_id: orgId,
          email: 'cliente@exemplo.com',
          duration: { presetId: 'year1' },
        },
        context
      );

      expect(result.license.status).toBe('active');
      expect(result.license.activated_at).toBe(NOW_ISO);
      expect(result.license.expires_at).toBe('2027-07-28T12:00:00.000Z');
      expect(result.licenseKey).toMatch(/^WOLK1\./);
      expect(result.setupToken).toMatch(/^WOLKS1\./);
      expect(mock.state.audit.map((a) => a.action)).toEqual([
        'license.created',
        'license.activated',
      ]);
    });

    it('lifetime preset leaves expires_at null', async () => {
      const mock = createMock({
        organizations: [{ id: orgId, name: 'Imob Empresa' }],
      });
      const result = await provisionLicenseForOrganization(
        mock as never,
        { organization_id: orgId, duration: { presetId: 'lifetime' } },
        context
      );
      expect(result.license.expires_at).toBeNull();
      expect(result.license.status).toBe('active');
    });

    it('explicit expires_at overrides the duration preset', async () => {
      const mock = createMock({
        organizations: [{ id: orgId, name: 'Imob Empresa' }],
      });
      const result = await provisionLicenseForOrganization(
        mock as never,
        {
          organization_id: orgId,
          expires_at: '2030-01-01T00:00:00.000Z',
          duration: { presetId: 'lifetime' },
        },
        context
      );
      expect(result.license.expires_at).toBe('2030-01-01T00:00:00.000Z');
    });

    it('rejects an organization that already has a license', async () => {
      const mock = createMock({
        organizations: [{ id: orgId, name: 'Imob Empresa' }],
        licenses: [baseLicense()],
      });
      await expect(
        provisionLicenseForOrganization(
          mock as never,
          { organization_id: orgId },
          context
        )
      ).rejects.toMatchObject({ code: 'LICENSE_ALREADY_EXISTS', status: 409 });
    });

    it('omits the setup token when no signing key is configured', async () => {
      const previous = process.env.LICENSE_SIGNING_PRIVATE_KEY;
      delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
      try {
        const mock = createMock({
          organizations: [{ id: orgId, name: 'Imob Empresa' }],
        });
        const result = await provisionLicenseForOrganization(
          mock as never,
          { organization_id: orgId },
          context
        );
        expect(result.setupToken).toBeNull();
        expect(result.license.status).toBe('active');
      } finally {
        if (previous !== undefined) {
          process.env.LICENSE_SIGNING_PRIVATE_KEY = previous;
        }
      }
    });
  });

  describe('bindDomainToLicenseViaSetupToken', () => {
    const licenseId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    it('binds the domain to the license and organization', async () => {
      const token = createSetupToken(
        { licenseId, organizationId: orgId, email: 'cliente@exemplo.com' },
        { privateKeyPem: keyPair.privateKeyPem, now: NOW }
      );
      const mock = createMock({
        licenses: [baseLicense({ id: licenseId, status: 'active' })],
        organizations: [
          {
            id: orgId,
            name: 'Imob Empresa',
            custom_domain: null,
            platform_domain: null,
          },
        ],
        orgDomains: [],
      });

      const result = await bindDomainToLicenseViaSetupToken(
        mock as never,
        { token, domain: 'meucliente.com.br', purpose: 'both' },
        context
      );

      expect(result.domain).toBe('meucliente.com.br');
      expect(result.purpose).toBe('both');
      expect(result.dnsVerified).toBe(false);

      const bound = mock.state.domains.find((d) => d.license_id === licenseId);
      expect(bound).toBeTruthy();
      expect(bound?.domain).toBe('meucliente.com.br');
      expect(mock.state.audit[0].action).toBe('license.domain_linked');
      expect(mock.state.auditLogs[0].action).toBe('license.domain_linked');
    });

    it('rejects an invalid token', async () => {
      const mock = createMock({});
      await expect(
        bindDomainToLicenseViaSetupToken(
          mock as never,
          { token: 'x', domain: 'meucliente.com.br' },
          context
        )
      ).rejects.toMatchObject({ code: 'TOKEN_FORMAT', status: 400 });
    });

    it('rejects a token pointing to another organization', async () => {
      const otherOrg = '33333333-3333-4333-8333-333333333333';
      const token = createSetupToken(
        { licenseId, organizationId: otherOrg },
        { privateKeyPem: keyPair.privateKeyPem, now: NOW }
      );
      const mock = createMock({
        licenses: [baseLicense({ id: licenseId, status: 'active' })],
      });
      await expect(
        bindDomainToLicenseViaSetupToken(
          mock as never,
          { token, domain: 'meucliente.com.br' },
          context
        )
      ).rejects.toMatchObject({ code: 'LICENSE_ORG_MISMATCH', status: 403 });
    });
  });

  describe('LicenseAdminError', () => {
    it('carries code and http status', () => {
      const error = new LicenseAdminError('x', 'SOME_CODE', 403);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('SOME_CODE');
      expect(error.status).toBe(403);
    });
  });
});
