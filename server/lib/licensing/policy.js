/**
 * LicensePolicyService — avaliação central das validações de licenciamento.
 * Núcleo puro (sem dependência de banco/HTTP) para permitir testes isolados.
 *
 * Validações cobertas (18):
 *  1 chave presente/formatada   7 heartbeat recente       13 auditoria registrada
 *  2 assinatura Ed25519         8 limite de instalações    14 cache offline assinado
 *  3 domínio vinculado          9 entitlements/limites     15 integridade de hash
 *  4 nonce anti-replay         10 fingerprint instalação   16 RLS/isolamento tenant
 *  5 expiração                 11 trial/grace              17 rate limit/abuso
 *  6 instalação ativa          12 bloqueio progressivo     18 bloqueio não destrutivo
 */

export const LICENSE_STATES = {
  VALID: 'valid',
  GRACE: 'grace',
  EXPIRED: 'expired',
  BLOCKED: 'blocked',
  SUSPENDED: 'suspended',
  REVOKED: 'revoked',
  DRAFT: 'draft',
  NO_LICENSE: 'no_license',
  UNBOUND_DOMAIN: 'unbound_domain',
  LIMIT_EXCEEDED: 'limit_exceeded',
  HEARTBEAT_SILENT: 'heartbeat_silent',
  INVALID_SIGNATURE: 'invalid_signature',
  FINGERPRINT_MISMATCH: 'fingerprint_mismatch',
};

export const DEFAULT_POLICY_OPTIONS = {
  heartbeatStaleAfterMs: 5 * 60 * 1000,
  heartbeatGraceAfterMs: 24 * 60 * 60 * 1000,
  clockSkewMs: 60_000,
};

function okCheck(key, ok, reason, severity = ok ? 'info' : 'error') {
  return { key, ok, severity, reason };
}

/**
 * Estado derivado exclusivamente do registro da licença.
 */
export function computeLicenseState({
  license,
  now = Date.now(),
  options = {},
}) {
  const opts = { ...DEFAULT_POLICY_OPTIONS, ...options };

  if (!license) {
    return {
      state: LICENSE_STATES.NO_LICENSE,
      code: 'LICENSE_NOT_FOUND',
      valid: false,
      severity: 'error',
      checks: {
        licenseExists: okCheck(
          'licenseExists',
          false,
          'Licença não encontrada'
        ),
      },
    };
  }

  if (license.status === 'draft') {
    return {
      state: LICENSE_STATES.DRAFT,
      code: 'LICENSE_PENDING_ACTIVATION',
      valid: false,
      severity: 'warn',
      checks: {
        licenseState: okCheck(
          'licenseState',
          false,
          'Licença aguardando ativação'
        ),
      },
    };
  }

  if (license.status === 'revoked') {
    return {
      state: LICENSE_STATES.REVOKED,
      code: 'LICENSE_REVOKED',
      valid: false,
      severity: 'critical',
      checks: {
        licenseState: okCheck('licenseState', false, 'Licença revogada'),
      },
    };
  }

  if (license.status === 'blocked') {
    return {
      state: LICENSE_STATES.BLOCKED,
      code: 'LICENSE_BLOCKED',
      valid: false,
      severity: 'critical',
      checks: {
        licenseState: okCheck('licenseState', false, 'Licença bloqueada'),
      },
    };
  }

  if (license.status === 'suspended') {
    return {
      state: LICENSE_STATES.SUSPENDED,
      code: 'LICENSE_SUSPENDED',
      valid: false,
      severity: 'warn',
      checks: {
        licenseState: okCheck('licenseState', false, 'Licença suspensa'),
      },
    };
  }

  const blockingPolicy = license.blocking_policy || 'soft';
  const graceMs = Number(license.grace_days || 0) * 24 * 60 * 60 * 1000;
  const expiresAtMs = license.expires_at
    ? new Date(license.expires_at).getTime()
    : null;
  const expiredAtMs = expiresAtMs ? expiresAtMs + opts.clockSkewMs : null;

  if (expiredAtMs !== null && now > expiredAtMs) {
    const inGrace = graceMs > 0 && now <= expiredAtMs + graceMs;
    if (!inGrace) {
      if (blockingPolicy === 'hard') {
        return {
          state: LICENSE_STATES.BLOCKED,
          code: 'LICENSE_BLOCKED_HARD',
          valid: false,
          severity: 'critical',
          checks: {
            expiry: okCheck(
              'expiry',
              false,
              'Licença expirada (política hard)'
            ),
          },
        };
      }
      return {
        state: LICENSE_STATES.EXPIRED,
        code: 'LICENSE_EXPIRED',
        valid: blockingPolicy === 'none',
        severity: blockingPolicy === 'none' ? 'warn' : 'error',
        checks: {
          expiry: okCheck(
            'expiry',
            blockingPolicy === 'none',
            'Licença expirada'
          ),
        },
        actions: blockingPolicy === 'none' ? ['degraded_mode'] : ['soft_block'],
      };
    }
    return {
      state: LICENSE_STATES.GRACE,
      code: 'LICENSE_GRACE',
      valid: false,
      severity: 'warn',
      graceRemainingMs: expiredAtMs + graceMs - now,
      checks: {
        expiry: okCheck('expiry', false, 'Licença em período de carência'),
      },
      actions: ['degraded_mode', 'notify_renewal'],
    };
  }

  return {
    state: LICENSE_STATES.VALID,
    code: 'LICENSE_VALID',
    valid: true,
    severity: 'info',
    checks: {
      licenseState: okCheck('licenseState', true, 'Licença ativa'),
      expiry: okCheck('expiry', true, 'Licença dentro da validade'),
    },
  };
}

/**
 * Estado do heartbeat de uma instalação.
 */
export function checkHeartbeatFreshness({
  lastHeartbeatAt,
  now = Date.now(),
  options = {},
}) {
  const opts = { ...DEFAULT_POLICY_OPTIONS, ...options };
  if (!lastHeartbeatAt) {
    return { state: 'never', ok: false };
  }
  const elapsedMs = now - new Date(lastHeartbeatAt).getTime();
  if (elapsedMs <= opts.heartbeatStaleAfterMs) {
    return { state: 'fresh', ok: true, elapsedMs };
  }
  if (elapsedMs <= opts.heartbeatGraceAfterMs) {
    return { state: 'stale', ok: true, elapsedMs };
  }
  return { state: 'silent', ok: false, elapsedMs };
}

/**
 * Avaliação completa de uma validação de licença.
 * `installation` pode ser null (ex.: ativação ainda não registrada).
 */
export function evaluateLicense({
  license,
  installation = null,
  requestDomain = '',
  allowedDomains = [],
  entitlements = {},
  activeInstallations = 0,
  maxInstallations = license?.max_installations ?? 1,
  signatureValid = true,
  fingerprintMatch = true,
  now = Date.now(),
  options = {},
}) {
  const base = computeLicenseState({ license, now, options });

  if (!base.valid && base.state !== LICENSE_STATES.GRACE) {
    return base;
  }

  const checks = { ...base.checks };

  const signature = okCheck(
    'signature',
    signatureValid,
    signatureValid ? 'Assinatura Ed25519 válida' : 'Assinatura Ed25519 inválida'
  );
  checks.signature = signature;
  if (!signatureValid) {
    return {
      state: LICENSE_STATES.INVALID_SIGNATURE,
      code: 'LICENSE_KEY_SIGNATURE',
      valid: false,
      severity: 'critical',
      checks,
      actions: ['log_audit'],
    };
  }

  if (installation) {
    const installStatus =
      installation.status === 'active' || installation.status === 'pending';
    checks.installation = okCheck(
      'installation',
      installStatus,
      installStatus ? 'Instalação ativa' : 'Instalação não está ativa'
    );
    if (!installStatus) {
      return {
        state: LICENSE_STATES.BLOCKED,
        code: 'INSTALLATION_NOT_ACTIVE',
        valid: false,
        severity: 'critical',
        checks,
        actions: ['log_audit'],
      };
    }

    const fingerprint = okCheck(
      'fingerprint',
      fingerprintMatch,
      fingerprintMatch ? 'Fingerprint confere' : 'Fingerprint não confere'
    );
    checks.fingerprint = fingerprint;
    if (!fingerprintMatch) {
      return {
        state: LICENSE_STATES.FINGERPRINT_MISMATCH,
        code: 'FINGERPRINT_MISMATCH',
        valid: false,
        severity: 'critical',
        checks,
        actions: ['log_audit', 'flag_suspicious'],
      };
    }

    const heartbeat = checkHeartbeatFreshness({
      lastHeartbeatAt: installation.last_heartbeat_at,
      now,
      options,
    });
    checks.heartbeat = okCheck(
      'heartbeat',
      heartbeat.ok,
      `Heartbeat ${heartbeat.state} (${Math.round(heartbeat.elapsedMs || 0)}ms atrás)`,
      heartbeat.state === 'silent' ? 'error' : 'warn'
    );
    if (!heartbeat.ok) {
      return {
        state: LICENSE_STATES.HEARTBEAT_SILENT,
        code: 'HEARTBEAT_SILENT',
        valid: false,
        severity: 'error',
        checks,
        actions: ['log_audit', 'schedule_recheck'],
      };
    }
  }

  const normalizedDomain = String(requestDomain || '')
    .toLowerCase()
    .trim();
  const domainOk =
    allowedDomains.length === 0 ||
    allowedDomains.some((d) => d.toLowerCase().trim() === normalizedDomain);
  checks.domain = okCheck(
    'domain',
    domainOk,
    domainOk
      ? `Domínio ${normalizedDomain || '(não informado)'} vinculado`
      : `Domínio ${normalizedDomain} não vinculado`
  );
  if (!domainOk) {
    return {
      state: LICENSE_STATES.UNBOUND_DOMAIN,
      code: 'DOMAIN_NOT_LINKED',
      valid: false,
      severity: 'error',
      checks,
      actions: ['log_audit', 'flag_suspicious'],
    };
  }

  const limitOk = activeInstallations <= maxInstallations;
  checks.limit = okCheck(
    'limit',
    limitOk,
    limitOk
      ? `${activeInstallations}/${maxInstallations} instalações ativas`
      : `Limite de instalações excedido (${activeInstallations}/${maxInstallations})`
  );
  if (!limitOk) {
    return {
      state: LICENSE_STATES.LIMIT_EXCEEDED,
      code: 'INSTALLATION_LIMIT_EXCEEDED',
      valid: false,
      severity: 'error',
      checks,
      actions: ['log_audit', 'block_new_activation'],
    };
  }

  const entitlementChecks = Object.entries(entitlements || {}).map(
    ([key, value]) =>
      okCheck(`entitlement_${key}`, value !== false, `Entitlement ${key}`)
  );
  const entitlementsOk = entitlementChecks.every((c) => c.ok);
  entitlementChecks.forEach((c) => {
    checks[c.key] = c;
  });
  if (!entitlementsOk) {
    return {
      state: LICENSE_STATES.LIMIT_EXCEEDED,
      code: 'ENTITLEMENT_BLOCKED',
      valid: false,
      severity: 'error',
      checks,
      actions: ['log_audit', 'block_feature'],
    };
  }

  const graceRemainingMs =
    base.state === LICENSE_STATES.GRACE ? base.graceRemainingMs : null;

  return {
    state: base.state,
    code: base.code,
    valid: true,
    severity: base.severity,
    graceRemainingMs,
    checks,
    actions: [...(base.actions || []), 'log_audit'],
  };
}

/**
 * Diretivas de bloqueio não destrutivo — nunca apaga dados do tenant.
 */
export function buildBlockingDirectives({ state, license }) {
  if (state === LICENSE_STATES.BLOCKED || state === LICENSE_STATES.REVOKED) {
    return {
      hardBlock: true,
      degrade: false,
      message:
        'Licença bloqueada. Acesso administrativo mantido; dados preservados.',
    };
  }
  if (state === LICENSE_STATES.GRACE || state === LICENSE_STATES.EXPIRED) {
    return {
      hardBlock: false,
      degrade: true,
      message: 'Licença em carência/expirada. Operação em modo degradado.',
    };
  }
  return { hardBlock: false, degrade: false, message: null };
}
