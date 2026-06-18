import { getSupabaseServer } from '../lib/supabase-server.js';
import { TtlCache } from '../lib/ttl-cache.js';

const tenantCache = new TtlCache(60_000);

/**
 * server/middleware/tenant.js
 *
 * Middleware de garantia de tenant.
 * Deve ser usado apos verifyAuth/verifyAdmin.
 */
export const requireTenant = async (req, res, next) => {
  if (!req.orgId) {
    const recoveredOrgId = await recoverTenantFromAuthenticatedUser(req);
    if (recoveredOrgId) {
      req.orgId = recoveredOrgId;
      console.warn('[TenantMiddleware] Tenant recuperado apos auth sem orgId', {
        method: req.method,
        path: req.path,
        userId: req.user?.id || null,
        email: maskEmail(req.user?.email),
        role: req.userRole || null,
        organizationId: recoveredOrgId,
      });
    }
  }

  if (!req.orgId) {
    console.error(
      `[TenantMiddleware] Bloqueio: requisicao sem OrganizationID para ${req.method} ${req.path}`,
      {
        userId: req.user?.id || null,
        email: maskEmail(req.user?.email),
        role: req.userRole || null,
        realOrgId: req.realOrgId || null,
        impersonating: !!req.isImpersonating,
      }
    );
    return res.status(403).json({
      error: 'Acesso negado: Organizacao nao identificada.',
      code: 'TENANT_REQUIRED',
      auth_context: {
        user_id: req.user?.id || null,
        email: maskEmail(req.user?.email),
        role: req.userRole || null,
        real_org_id: req.realOrgId || null,
        impersonating: !!req.isImpersonating,
      },
    });
  }

  if (req.body && req.body.organization_id && req.body.organization_id !== req.orgId) {
    if (!req.isImpersonating) {
      console.warn(
        `[Security] Tentativa de spoofing de OrgID detectada do usuario ${req.user.email}`
      );
      return res.status(400).json({
        error: 'Operacao invalida: Tentativa de manipulacao de Tenant detectada.',
      });
    }
  }

  if (req.tenantValidated) return next();

  try {
    const supabase = getSupabaseServer();
    let tenantLookupError = null;
    const organization = await tenantCache.getOrLoad(req.orgId, async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', req.orgId)
        .maybeSingle();
      tenantLookupError = error;
      return data || undefined;
    });

    if (tenantLookupError || !organization) {
      console.error(
        `[TenantMiddleware] Tenant inexistente bloqueado: ${req.orgId} em ${req.method} ${req.path}`
      );
      return res.status(403).json({
        error: 'Organizacao nao encontrada ou tenant invalido.',
        code: 'INVALID_TENANT',
      });
    }

    req.orgId = organization.id;
    req.tenantValidated = true;
  } catch (error) {
    console.error('[TenantMiddleware] Erro ao validar tenant:', error.message);
    return res.status(500).json({
      error: 'Erro interno ao validar organizacao.',
      code: 'TENANT_VALIDATION_FAILED',
    });
  }

  next();
};

async function recoverTenantFromAuthenticatedUser(req) {
  try {
    const supabase = getSupabaseServer();
    const userId = req.user?.id;
    const email = String(req.user?.email || '').toLowerCase().trim();

    if (userId) {
      const { data: profileById, error: profileByIdError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .maybeSingle();

      if (!profileByIdError && profileById?.organization_id) {
        return profileById.organization_id;
      }
    }

    if (email) {
      const { data: profileByEmail, error: profileByEmailError } = await supabase
        .from('profiles')
        .select('organization_id')
        .ilike('email', email)
        .not('organization_id', 'is', null)
        .limit(1)
        .maybeSingle();

      if (!profileByEmailError && profileByEmail?.organization_id) {
        return profileByEmail.organization_id;
      }

      const { data: organization, error: organizationError } = await supabase
        .from('organizations')
        .select('id')
        .ilike('owner_email', email)
        .maybeSingle();

      if (!organizationError && organization?.id) {
        return organization.id;
      }
    }
  } catch (error) {
    console.error(
      '[TenantMiddleware] Erro ao recuperar tenant do usuario autenticado:',
      error.message
    );
  }

  return null;
}

function maskEmail(email = '') {
  const [user, domain] = String(email).split('@');
  if (!user || !domain) return null;
  return `${user.slice(0, 2)}***@${domain}`;
}
