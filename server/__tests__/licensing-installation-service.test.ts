import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLicenseKey, generateKeyPair } from '../lib/licensing/crypto.js';
import { verifyValidationEnvelope } from '../lib/licensing/envelope.js';
import {
  activateInstallation,
  LicenseEndpointError,
  sendHeartbeat,
  validateInstallation,
} from '../lib/licensing/installation-service.js';

type Row = Record<string, unknown>;

const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const NOW_ISO = new Date(NOW).toISOString();

let keyPair: ReturnType<typeof generateKeyPair>;
let licenseKey: string;
let nonceCounter = 0;

function nextNonce() {
  nonceCounter += 1;
  return `test-nonce-${nonceCounter}-${'a'.repeat(24)}`;
}

function createMock(seed: {
  license?: Row;
  installations?: Row[];
  domains?: Row[];
  entitlements?: Row[];
} = {}) {
  const state: {
    licenses: Row[];
    installations: Row[];
    domains: Row[];
    entitlements: Row[];
    heartbeats: Row[];
    audit: Row[];
  } = {
    licenses: seed.license ? [seed.license] : [],
    installations: seed.installations || [],
    domains: seed.domains || [],
    entitlements: seed.entitlements || [],
    heartbeats: [],
    audit: [],
  };

  const tables: Record<string, Row[]> = {
    licenses: state.licenses,
    license_installations: state.installations,
    license_domains: state.domains,
    license_entitlements: state.entitlements,
    license_heartbeats: state.heartbeats,
    license_audit_events: state.audit,
  };

  type Filters = {
    eq: Record<string, unknown>;
    in: Record<string, unknown[]>;
    is: Record<string, unknown>;
  };

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
    if (q.limitN) rows = rows.slice(0, q.limitN);
    return rows;
  }

  function buildQuery(table: string) {
    const filters: Filters = { eq: {}, in: {}, is: {} };
    const q: any = {
      select(columns: unknown, opts?: { count?: boolean }) {
        q.countMode = !!opts?.count;
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
      limit(n: number) {
        q.limitN = n;
        return q;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        q.orderCol = col;
        q.ascending = opts?.ascending !== false;
        return q;
      },
      then(resolve: (v: { data?: Row[]; count?: number; error: null }) => void) {
        const rows = filtered(table, filters, q);
        if (q.countMode) {
          return Promise.resolve({ count: rows.length, error: null }).then(resolve);
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
      update(patch: Row) {
        return {
          eq(col: string, val: unknown) {
            return {
              select() {
                return {
                  async single() {
                    const row = tables[table].find((r) =>
                      matches(r, { ...filters, eq: { ...filters.eq, [col]: val } })
                    );
                    if (!row) return { data: null, error: null };
                    Object.assign(row, patch);
                    return { data: row, error: null };
                  },
                };
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
    id: 'lic-1',
    organization_id: 'org-1',
    license_key: licenseKey,
    plan_id: null,
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

function activeInstallation(patch: Row = {}) {
  return {
    id: 'inst-1',
    license_id: 'lic-1',
    organization_id: 'org-1',
    installation_id: '11111111-1111-4111-8111-111111111111',
    installation_fingerprint: 'fp-111111111111111111111111',
    status: 'active',
    last_seen_at: NOW_ISO,
    last_heartbeat_at: NOW_ISO,
    last_ip: '127.0.0.1',
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    ...patch,
  };
}

describe('license installation service', () => {
  beforeEach(() => {
    keyPair = generateKeyPair();
    process.env.LICENSE_SIGNING_PRIVATE_KEY = keyPair.privateKeyPem;
    process.env.LICENSE_SIGNING_PUBLIC_KEY = keyPair.publicKeyPem;
    licenseKey = createLicenseKey(keyPair.privateKeyPem, {
      licenseId: 'lic-1',
      orgId: 'org-1',
      edition: 'standard',
      maxInstallations: 1,
      issuedAt: NOW,
      expiresAt: null,
    });
  });

  afterEach(() => {
    delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
    delete process.env.LICENSE_SIGNING_PUBLIC_KEY;
  });

  describe('activateInstallation', () => {
    it('activates a draft license, creates the installation and signs an envelope', async () => {
      const mock = createMock({ license: baseLicense() });
      const nonce = nextNonce();

      const result = await activateInstallation(mock as never, {
        licenseKey,
        nonce,
        installationId: '11111111-1111-4111-8111-111111111111',
        installationFingerprint: 'fp-111111111111111111111111',
        domain: 'panel.example.com',
        hostname: 'panel.example.com',
        platform: 'node',
        version: '1.0.0',
        ipAddress: '203.0.113.10',
        now: NOW,
      });

      expect(result.success).toBe(true);
      expect(result.state).toBe('valid');
      expect(result.installation).toMatchObject({
        installation_fingerprint: 'fp-111111111111111111111111',
        status: 'active',
      });

      expect(mock.state.licenses[0]?.status).toBe('active');
      expect(mock.state.licenses[0]?.activated_at).toBe(NOW_ISO);
      expect(mock.state.installations).toHaveLength(1);
      expect(mock.state.heartbeats).toHaveLength(1);
      expect(mock.state.audit).toHaveLength(1);
      expect(mock.state.audit[0]?.action).toBe('license.activated');

      expect(result.envelope.signature).toBeTruthy();
      const payload = verifyValidationEnvelope(
        keyPair.publicKeyPem,
        result.envelope
      );
      expect(payload.state).toBe('valid');
      expect(payload.valid).toBe(true);
      expect(payload.licenseId).toBe('lic-1');
    });

    it('rejects a license key with an invalid signature', async () => {
      const other = generateKeyPair();
      const forgedKey = createLicenseKey(other.privateKeyPem, {
        licenseId: 'lic-1',
        orgId: 'org-1',
      });
      const mock = createMock({ license: baseLicense() });

      await expect(
        activateInstallation(mock as never, {
          licenseKey: forgedKey,
          nonce: nextNonce(),
          installationId: '11111111-1111-4111-8111-111111111111',
          installationFingerprint: 'fp-111111111111111111111111',
          now: NOW,
        })
      ).rejects.toMatchObject({
        code: 'LICENSE_KEY_SIGNATURE',
        status: 403,
      });
    });

    it('rejects an unknown license', async () => {
      const mock = createMock({});
      await expect(
        activateInstallation(mock as never, {
          licenseKey,
          nonce: nextNonce(),
          installationId: '11111111-1111-4111-8111-111111111111',
          installationFingerprint: 'fp-111111111111111111111111',
          now: NOW,
        })
      ).rejects.toMatchObject({ code: 'LICENSE_NOT_FOUND', status: 404 });
    });

    it('rejects activation of a blocked license', async () => {
      const mock = createMock({ license: baseLicense({ status: 'blocked' }) });
      await expect(
        activateInstallation(mock as never, {
          licenseKey,
          nonce: nextNonce(),
          installationId: '11111111-1111-4111-8111-111111111111',
          installationFingerprint: 'fp-111111111111111111111111',
          now: NOW,
        })
      ).rejects.toMatchObject({ code: 'LICENSE_BLOCKED', status: 403 });
    });

    it('rejects activation when the domain is not bound to the license', async () => {
      const mock = createMock({
        license: baseLicense({ status: 'active' }),
        domains: [
          {
            id: 'dom-1',
            license_id: 'lic-1',
            organization_id: 'org-1',
            domain: 'panel.example.com',
            purpose: 'both',
            status: 'active',
          },
        ],
      });

      await expect(
        activateInstallation(mock as never, {
          licenseKey,
          nonce: nextNonce(),
          installationId: '11111111-1111-4111-8111-111111111111',
          installationFingerprint: 'fp-111111111111111111111111',
          domain: 'other.example.com',
          now: NOW,
        })
      ).rejects.toMatchObject({ code: 'DOMAIN_NOT_LINKED', status: 403 });
    });

    it('rejects activation when the installation limit is exceeded', async () => {
      const mock = createMock({
        license: baseLicense({
          status: 'active',
          max_installations: 1,
        }),
        installations: [activeInstallation()],
      });

      await expect(
        activateInstallation(mock as never, {
          licenseKey,
          nonce: nextNonce(),
          installationId: '22222222-2222-4222-8222-222222222222',
          installationFingerprint: 'fp-222222222222222222222222',
          now: NOW,
        })
      ).rejects.toMatchObject({
        code: 'INSTALLATION_LIMIT_EXCEEDED',
        status: 429,
      });
    });

    it('rejects nonce reuse (anti-replay)', async () => {
      const mock = createMock({ license: baseLicense() });
      const nonce = nextNonce();
      const input = {
        licenseKey,
        nonce,
        installationId: '11111111-1111-4111-8111-111111111111',
        installationFingerprint: 'fp-111111111111111111111111',
        now: NOW,
      };

      await activateInstallation(mock as never, input);

      await expect(
        activateInstallation(mock as never, input)
      ).rejects.toMatchObject({ code: 'LICENSE_NONCE_REPLAY', status: 409 });
    });

    it('rejects a key whose payload points to another license', async () => {
      const mismatched = createLicenseKey(keyPair.privateKeyPem, {
        licenseId: 'lic-999',
        orgId: 'org-1',
      });
      const mock = createMock({
        license: baseLicense({ license_key: mismatched }),
      });

      await expect(
        activateInstallation(mock as never, {
          licenseKey: mismatched,
          nonce: nextNonce(),
          installationId: '11111111-1111-4111-8111-111111111111',
          installationFingerprint: 'fp-111111111111111111111111',
          now: NOW,
        })
      ).rejects.toMatchObject({ code: 'LICENSE_KEY_MISMATCH', status: 403 });
    });
  });

  describe('validateInstallation', () => {
    it('returns a valid envelope for an active installation on a bound domain', async () => {
      const mock = createMock({
        license: baseLicense({ status: 'active' }),
        installations: [
          activeInstallation({
            last_heartbeat_at: new Date(NOW - 60_000).toISOString(),
          }),
        ],
        domains: [
          {
            id: 'dom-1',
            license_id: 'lic-1',
            organization_id: 'org-1',
            domain: 'panel.example.com',
            purpose: 'both',
            status: 'active',
          },
        ],
      });

      const result = await validateInstallation(mock as never, {
        licenseKey,
        nonce: nextNonce(),
        installationFingerprint: 'fp-111111111111111111111111',
        domain: 'panel.example.com',
        now: NOW,
      });

      expect(result.valid).toBe(true);
      expect(result.state).toBe('valid');
      const payload = verifyValidationEnvelope(
        keyPair.publicKeyPem,
        result.envelope
      );
      expect(payload.valid).toBe(true);
      expect(payload.installationFingerprint).toBe(
        'fp-111111111111111111111111'
      );
      expect(mock.state.audit).toHaveLength(0);
    });

    it('fails validation for an unknown fingerprint', async () => {
      const mock = createMock({
        license: baseLicense({ status: 'active' }),
        installations: [activeInstallation()],
      });

      const result = await validateInstallation(mock as never, {
        licenseKey,
        nonce: nextNonce(),
        installationFingerprint: 'fp-999999999999999999999999',
        domain: 'panel.example.com',
        now: NOW,
      });

      expect(result.valid).toBe(false);
      expect(result.state).toBe('fingerprint_mismatch');
      expect(mock.state.audit).toHaveLength(1);
      expect(mock.state.audit[0]?.action).toBe('license.validation_failed');
    });

    it('returns the blocked state for a blocked license', async () => {
      const mock = createMock({
        license: baseLicense({ status: 'blocked' }),
        installations: [activeInstallation()],
      });

      const result = await validateInstallation(mock as never, {
        licenseKey,
        nonce: nextNonce(),
        installationFingerprint: 'fp-111111111111111111111111',
        domain: 'panel.example.com',
        now: NOW,
      });

      expect(result.valid).toBe(false);
      expect(result.state).toBe('blocked');
    });
  });

  describe('sendHeartbeat', () => {
    it('updates timestamps and returns a valid envelope', async () => {
      const mock = createMock({
        license: baseLicense({ status: 'active' }),
        installations: [
          activeInstallation({
            last_heartbeat_at: new Date(NOW - 120_000).toISOString(),
          }),
        ],
      });

      const result = await sendHeartbeat(mock as never, {
        licenseKey,
        nonce: nextNonce(),
        installationFingerprint: 'fp-111111111111111111111111',
        domain: 'panel.example.com',
        hostname: 'panel.example.com',
        version: '1.0.1',
        now: NOW,
      });

      expect(result.valid).toBe(true);
      expect(result.state).toBe('valid');
      expect(mock.state.installations[0]?.last_heartbeat_at).toBe(NOW_ISO);
      expect(mock.state.installations[0]?.version).toBe('1.0.1');
      expect(mock.state.heartbeats).toHaveLength(1);
      expect(mock.state.heartbeats[0]?.nonce).toContain('test-nonce');
      const payload = verifyValidationEnvelope(
        keyPair.publicKeyPem,
        result.envelope
      );
      expect(payload.state).toBe('valid');
    });

    it('rejects heartbeat for an unregistered installation', async () => {
      const mock = createMock({ license: baseLicense({ status: 'active' }) });

      await expect(
        sendHeartbeat(mock as never, {
          licenseKey,
          nonce: nextNonce(),
          installationFingerprint: 'fp-999999999999999999999999',
          now: NOW,
        })
      ).rejects.toMatchObject({ code: 'INSTALLATION_NOT_FOUND', status: 404 });
    });

    it('records heartbeat and reports blocked state for a blocked license', async () => {
      const mock = createMock({
        license: baseLicense({ status: 'blocked' }),
        installations: [activeInstallation()],
      });

      const result = await sendHeartbeat(mock as never, {
        licenseKey,
        nonce: nextNonce(),
        installationFingerprint: 'fp-111111111111111111111111',
        now: NOW,
      });

      expect(result.valid).toBe(false);
      expect(result.state).toBe('blocked');
      expect(mock.state.heartbeats).toHaveLength(1);
      expect(mock.state.audit).toHaveLength(1);
      const payload = verifyValidationEnvelope(
        keyPair.publicKeyPem,
        result.envelope
      );
      expect(payload.state).toBe('blocked');
      expect(payload.valid).toBe(false);
    });
  });

  describe('LicenseEndpointError', () => {
    it('carries code and http status', () => {
      const error = new LicenseEndpointError('x', 'SOME_CODE', 403);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('SOME_CODE');
      expect(error.status).toBe(403);
    });
  });
});
