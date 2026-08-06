/**
 * LicenseEnforcement — enforcement do licenciamento no acesso autenticado.
 *
 * Aplicado dentro de verifyAuth (server/middleware/auth.js) após a resolução
 * de tenant. Nunca bloqueia o control plane (superadmin sem impersonação).
 *
 * Modos (env LICENSE_ENFORCEMENT):
 *   off  (padrão) — nunca bloqueia; registra eventos relevantes (fail-open).
 *   soft — bloqueia blocked/revoked/suspended e expiração com política hard;
 *          graça/expirado soft entram em modo degradado (acesso liberado).
 *   hard — como soft, mas organização SEM licença recebe 403, exceto quando
 *          LICENSE_ENFORCEMENT_LEGACY_TENANTS=on (trata sem-licença como
 *          degradado, escape para tenants pré-rollout).
 *
 * Segurança: falha de infraestrutura (erro de banco/timeout) nunca bloqueia —
 * registra enforcement_error e segue fail-open. Bloqueio é não destrutivo.
 */

import { getSupabaseServer } from '../supabase-server.js';
import { TtlCache } from '../ttl-cache.js';
import { appendAuditEvent } from './installation-service.js';
import { computeLicenseState, LICENSE_STATES } from './policy.js';

export const LICENSE_ENFORCEMENT_MODES = new Set(['off', 'soft', 'hard']);

const LICENSE_CACHE_TTL_MS = 60_000;
const licenseCache = new TtlCache(LICENSE_CACHE_TTL_MS);

/** Estados auditados quando o modo off teria deixado passar (telemetria). */
const AUDITABLE_STATES = new Set([
  LICENSE_STATES.BLOCKED,
  LICENSE_STATES.REVOKED,
  LICENSE_STATES.SUSPENDED,
  LICENSE_STATES.EXPIRED,
  LICENSE_STATES.GRACE,
  LICENSE_STATES.NO_LICENSE,
]);

/** Throttle de auditoria por org+estado (1 evento por transição de estado). */
const lastAuditedState = new Map();

export function resolveEnforcementMode() {
  const raw = String(process.env.LICENSE_ENFORCEMENT || 'off')
    .toLowerCase()
    .trim();
  return LICENSE_ENFORCEMENT_MODES.has(raw) ? raw : 'off';
}

export function resolveLegacyTenantsFlag() {
  const raw = String(process.env.LICENSE_ENFORCEMENT_LEGACY_TENANTS || 'off')
    .toLowerCase()
    .trim();
  return raw === 'on' || raw === 'true' || raw === '1';
}

/**
 * Resolve a licença de uma organização (cache TTL 60s).
 * Retorna null quando a organização não possui licença.
 */
export async function resolveOrgLicense(supabase, organizationId) {
  const cacheKey = String(organizationId);
  return licenseCache.getOrLoad(cacheKey, async () => {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  });
}

/** Invalida o cache de enforcement da organização (chamado pelo admin-service). */
export function clearLicenseEnforcementCache(organizationId) {
  if (!organizationId) return;
  licenseCache.delete(String(organizationId));
}

/**
 * Control plane (superadmin sem impersonação) e perfis sem tenant são isentos.
 * Superadmin impersonando avalia a organização alvo (req.orgId = alvo).
 */
export function isEnforcementExempt({ userRole, isImpersonating, orgId }) {
  if (userRole === 'superadmin' && !isImpersonating) return true;
  if (!orgId) return true;
  return false;
}

/**
 * Decide a ação para o estado da licença.
 * Retorna { allow, status?, code, state, degraded, message, audit, severity }.
 */
export function buildEnforcementDecision({ mode, license, legacyTenants }) {
  if (!license) {
    if (mode === 'hard' && !legacyTenants) {
      return {
        allow: false,
        status: 403,
        code: 'LICENSE_NOT_FOUND',
        state: LICENSE_STATES.NO_LICENSE,
        degraded: false,
        audit: true,
        severity: 'error',
        message:
          'Licença não encontrada para esta organização. Contate o suporte.',
      };
    }
    return {
      allow: true,
      code: 'LICENSE_NOT_FOUND',
      state: LICENSE_STATES.NO_LICENSE,
      // Em modo hard, só chegamos aqui com legacyTenants=true (escape
      // pré-rollout): organização sem licença opera em modo degradado.
      degraded: mode === 'hard',
      audit: true,
      severity: 'warn',
      message: null,
    };
  }

  const base = computeLicenseState({ license });

  switch (base.state) {
    case LICENSE_STATES.VALID:
    case LICENSE_STATES.DRAFT:
      return {
        allow: true,
        code: base.code,
        state: base.state,
        degraded: false,
        audit: false,
        severity: 'info',
        message: null,
      };

    case LICENSE_STATES.GRACE:
      return {
        allow: true,
        code: base.code,
        state: base.state,
        degraded: true,
        audit: true,
        severity: 'warn',
        message:
          'Licença em período de carência. Renove para evitar interrupção.',
      };

    case LICENSE_STATES.EXPIRED:
      // computeLicenseState: expired hard vira BLOCKED; aqui sobram soft/none.
      return {
        allow: true,
        code: base.code,
        state: base.state,
        degraded: !base.valid,
        audit: !base.valid,
        severity: 'warn',
        message: !base.valid
          ? 'Licença expirada. Operação em modo degradado.'
          : null,
      };

    case LICENSE_STATES.BLOCKED:
    case LICENSE_STATES.REVOKED:
    case LICENSE_STATES.SUSPENDED: {
      const message =
        base.state === LICENSE_STATES.SUSPENDED
          ? 'Licença suspensa. Contate o suporte.'
          : 'Licença bloqueada. Contate o suporte.';
      if (mode === 'off') {
        return {
          allow: true,
          code: base.code,
          state: base.state,
          degraded: true,
          audit: true,
          severity: base.severity === 'critical' ? 'critical' : 'warn',
          message,
        };
      }
      return {
        allow: false,
        status: 403,
        code: base.code,
        state: base.state,
        degraded: true,
        audit: true,
        severity: base.severity === 'critical' ? 'critical' : 'warn',
        message,
      };
    }

    default:
      return {
        allow: true,
        code: base.code,
        state: base.state,
        degraded: false,
        audit: false,
        severity: base.severity || 'info',
        message: null,
      };
  }
}

function auditStateKey(orgId, state) {
  return `${orgId}:${state}`;
}

/**
 * Auditoria de decisão de enforcement (throttled por transição de estado).
 * Com licença → license_audit_events (hash encadeado); sem licença → audit_logs.
 * Falhas de auditoria são logadas, nunca bloqueiam a request.
 */
async function auditDecision(
  supabase,
  { orgId, license, decision, actorId, ipAddress }
) {
  const stateKey = auditStateKey(orgId, decision.state);
  if (lastAuditedState.get(stateKey) === decision.state) return;
  lastAuditedState.set(stateKey, decision.state);
  if (lastAuditedState.size > 10_000) lastAuditedState.clear();

  try {
    if (license) {
      await appendAuditEvent(supabase, {
        licenseId: license.id,
        organizationId: orgId,
        installationId: null,
        actorId: actorId || null,
        action: `license.enforcement.${decision.state}`,
        severity: decision.severity,
        eventData: {
          code: decision.code,
          mode: 'runtime',
          blocked: decision.allow === false,
        },
        ipAddress: ipAddress || null,
        now: Date.now(),
      });
    } else {
      await supabase.from('audit_logs').insert([
        {
          actor_id: actorId || null,
          target_resource: 'organization',
          action: `license.enforcement.${decision.state}`,
          details: { code: decision.code, blocked: decision.allow === false },
          ip_address: ipAddress || null,
          tenant_id: orgId,
        },
      ]);
    }
  } catch (error) {
    console.error(
      '[LicensingEnforcement] falha ao registrar auditoria:',
      error
    );
  }
}

/**
 * Middleware de enforcement.
 * - options.supabase: cliente (padrão getSupabaseServer()).
 * - options.mode/options.legacyTenants: sobrescrevem env (útil em testes).
 */
export function enforceLicenseAccess(options = {}) {
  return async (req, res, next) => {
    const supabase = options.supabase || getSupabaseServer();
    const mode = options.mode || resolveEnforcementMode();
    const legacyTenants =
      options.legacyTenants !== undefined
        ? Boolean(options.legacyTenants)
        : resolveLegacyTenantsFlag();

    try {
      if (isEnforcementExempt(req)) return next();

      const orgId = String(req.orgId);
      let license = null;
      try {
        license = await resolveOrgLicense(supabase, orgId);
      } catch (error) {
        console.error(
          '[LicensingEnforcement] erro ao resolver licença (fail-open):',
          error
        );
        req.licenseState = {
          state: LICENSE_STATES.NO_LICENSE,
          code: 'ENFORCEMENT_ERROR',
          degraded: false,
        };
        return next();
      }

      const decision = buildEnforcementDecision({
        mode,
        license,
        legacyTenants,
      });
      req.licenseState = {
        state: decision.state,
        code: decision.code,
        degraded: Boolean(decision.degraded),
        message: decision.message || null,
        expires_at: license?.expires_at || null,
        blocking_policy: license?.blocking_policy || null,
        edition: license?.edition || null,
      };

      if (decision.audit && AUDITABLE_STATES.has(decision.state)) {
        await auditDecision(supabase, {
          orgId,
          license,
          decision,
          actorId: req.authUserId || null,
          ipAddress: req.ip || null,
        });
      }

      if (decision.allow === false) {
        return res.status(decision.status).json({
          error: decision.message,
          code: decision.code,
          license: {
            state: decision.state,
            expires_at: license?.expires_at || null,
            blocking_policy: license?.blocking_policy || null,
          },
        });
      }

      return next();
    } catch (error) {
      console.error(
        '[LicensingEnforcement] falha inesperada (fail-open):',
        error
      );
      return next();
    }
  };
}

export function clearEnforcementAuditThrottle() {
  lastAuditedState.clear();
}
