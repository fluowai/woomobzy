import { describe, expect, it } from 'vitest';
import {
  buildBlockingDirectives,
  checkHeartbeatFreshness,
  computeLicenseState,
  DEFAULT_POLICY_OPTIONS,
  evaluateLicense,
  LICENSE_STATES,
} from '../lib/licensing/policy.js';

const now = Date.now();
const hour = 60 * 60 * 1000;
const day = 24 * hour;

function makeLicense(overrides = {}) {
  return {
    id: 'license-1',
    organization_id: 'org-1',
    status: 'active',
    blocking_policy: 'soft',
    grace_days: 3,
    max_installations: 1,
    expires_at: new Date(now + 30 * day).toISOString(),
    ...overrides,
  };
}

describe('computeLicenseState', () => {
  it('licença ativa válida', () => {
    const result = computeLicenseState({ license: makeLicense(), now });
    expect(result.valid).toBe(true);
    expect(result.state).toBe(LICENSE_STATES.VALID);
  });

  it('sem licença', () => {
    const result = computeLicenseState({ license: null, now });
    expect(result.valid).toBe(false);
    expect(result.state).toBe(LICENSE_STATES.NO_LICENSE);
  });

  it('draft, revogada, bloqueada e suspensa', () => {
    expect(computeLicenseState({ license: makeLicense({ status: 'draft' }), now }).state).toBe(
      LICENSE_STATES.DRAFT
    );
    expect(computeLicenseState({ license: makeLicense({ status: 'revoked' }), now }).state).toBe(
      LICENSE_STATES.REVOKED
    );
    expect(computeLicenseState({ license: makeLicense({ status: 'blocked' }), now }).state).toBe(
      LICENSE_STATES.BLOCKED
    );
    expect(computeLicenseState({ license: makeLicense({ status: 'suspended' }), now }).state).toBe(
      LICENSE_STATES.SUSPENDED
    );
  });

  it('expirada sem carência', () => {
    const license = makeLicense({
      expires_at: new Date(now - day).toISOString(),
      grace_days: 0,
    });
    const result = computeLicenseState({ license, now });
    expect(result.state).toBe(LICENSE_STATES.EXPIRED);
    expect(result.valid).toBe(false);
  });

  it('expirada em carência', () => {
    const license = makeLicense({ expires_at: new Date(now - day).toISOString(), grace_days: 3 });
    const result = computeLicenseState({ license, now });
    expect(result.state).toBe(LICENSE_STATES.GRACE);
    expect(result.graceRemainingMs).toBeGreaterThan(0);
  });

  it('expirada com política hard bloqueia', () => {
    const license = makeLicense({
      expires_at: new Date(now - day).toISOString(),
      grace_days: 0,
      blocking_policy: 'hard',
    });
    const result = computeLicenseState({ license, now });
    expect(result.state).toBe(LICENSE_STATES.BLOCKED);
    expect(result.code).toBe('LICENSE_BLOCKED_HARD');
  });

  it('política none degrada sem bloquear', () => {
    const license = makeLicense({
      expires_at: new Date(now - day).toISOString(),
      grace_days: 0,
      blocking_policy: 'none',
    });
    const result = computeLicenseState({ license, now });
    expect(result.state).toBe(LICENSE_STATES.EXPIRED);
    expect(result.valid).toBe(true);
  });
});

describe('checkHeartbeatFreshness', () => {
  it('classifica fresh, stale e silent', () => {
    const opts = DEFAULT_POLICY_OPTIONS;
    expect(checkHeartbeatFreshness({ lastHeartbeatAt: new Date(now - 1000).toISOString(), now }).ok).toBe(true);
    expect(
      checkHeartbeatFreshness({
        lastHeartbeatAt: new Date(now - opts.heartbeatStaleAfterMs - 1000).toISOString(),
        now,
      }).state
    ).toBe('stale');
    expect(
      checkHeartbeatFreshness({
        lastHeartbeatAt: new Date(now - opts.heartbeatGraceAfterMs - 1000).toISOString(),
        now,
      }).state
    ).toBe('silent');
  });
});

describe('evaluateLicense', () => {
  const license = makeLicense();

  it('valida licença ativa com domínio e fingerprint', () => {
    const result = evaluateLicense({
      license,
      installation: {
        status: 'active',
        last_heartbeat_at: new Date(now - 1000).toISOString(),
      },
      requestDomain: 'fazendasbrasil.com',
      allowedDomains: ['fazendasbrasil.com'],
      activeInstallations: 1,
      now,
    });
    expect(result.valid).toBe(true);
    expect(result.code).toBe('LICENSE_VALID');
  });

  it('rejeita assinatura inválida', () => {
    const result = evaluateLicense({ license, signatureValid: false, now });
    expect(result.valid).toBe(false);
    expect(result.state).toBe(LICENSE_STATES.INVALID_SIGNATURE);
  });

  it('rejeita domínio não vinculado', () => {
    const result = evaluateLicense({
      license,
      requestDomain: 'outro.com',
      allowedDomains: ['fazendasbrasil.com'],
      now,
    });
    expect(result.valid).toBe(false);
    expect(result.state).toBe(LICENSE_STATES.UNBOUND_DOMAIN);
  });

  it('rejeita heartbeat silencioso', () => {
    const result = evaluateLicense({
      license,
      installation: {
        status: 'active',
        last_heartbeat_at: new Date(now - 40 * day).toISOString(),
      },
      now,
    });
    expect(result.valid).toBe(false);
    expect(result.state).toBe(LICENSE_STATES.HEARTBEAT_SILENT);
  });

  it('rejeita limite de instalações excedido', () => {
    const result = evaluateLicense({
      license,
      activeInstallations: 5,
      maxInstallations: 1,
      now,
    });
    expect(result.valid).toBe(false);
    expect(result.state).toBe(LICENSE_STATES.LIMIT_EXCEEDED);
  });

  it('rejeita entitlement bloqueado', () => {
    const result = evaluateLicense({
      license,
      entitlements: { rural: false },
      now,
    });
    expect(result.valid).toBe(false);
    expect(result.code).toBe('ENTITLEMENT_BLOCKED');
  });

  it('rejeita fingerprint divergente', () => {
    const result = evaluateLicense({
      license,
      installation: {
        status: 'active',
        last_heartbeat_at: new Date(now - 1000).toISOString(),
      },
      fingerprintMatch: false,
      now,
    });
    expect(result.valid).toBe(false);
    expect(result.state).toBe(LICENSE_STATES.FINGERPRINT_MISMATCH);
  });

  it('rejeita instalação não ativa', () => {
    const result = evaluateLicense({
      license,
      installation: { status: 'revoked' },
      now,
    });
    expect(result.valid).toBe(false);
  });

  it('em carência mantém acesso degradado', () => {
    const expired = makeLicense({ expires_at: new Date(now - day).toISOString(), grace_days: 3 });
    const result = evaluateLicense({
      license: expired,
      installation: {
        status: 'active',
        last_heartbeat_at: new Date(now - 1000).toISOString(),
      },
      requestDomain: 'fazendasbrasil.com',
      allowedDomains: ['fazendasbrasil.com'],
      now,
    });
    expect(result.state).toBe(LICENSE_STATES.GRACE);
    expect(result.valid).toBe(true);
  });
});

describe('buildBlockingDirectives', () => {
  it('bloqueio é não destrutivo', () => {
    const directives = buildBlockingDirectives({ state: LICENSE_STATES.BLOCKED, license: {} });
    expect(directives.hardBlock).toBe(true);
    expect(directives.message).toContain('dados preservados');
  });

  it('carência degrada sem bloquear', () => {
    const directives = buildBlockingDirectives({ state: LICENSE_STATES.GRACE, license: {} });
    expect(directives.hardBlock).toBe(false);
    expect(directives.degrade).toBe(true);
  });
});
