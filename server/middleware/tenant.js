import { getSupabaseServer } from '../lib/supabase-server.js';

/**
 * server/middleware/tenant.js
 * 
 * Middleware de Garantia de Tenant.
 * Deve ser usado após verifyAuth/verifyAdmin.
 */
export const requireTenant = async (req, res, next) => {
  if (!req.orgId) {
    console.error(`[TenantMiddleware] ❌ Bloqueio: Requisição sem OrganizationID para ${req.method} ${req.path}`);
    return res.status(403).json({ 
      error: 'Acesso negado: Organização não identificada.',
      code: 'TENANT_REQUIRED'
    });
  }

  // Garantir que ninguém sobrescreva o orgId no body/query (Imutabilidade do req)
  if (req.body && req.body.organization_id && req.body.organization_id !== req.orgId) {
    if (!req.isImpersonating) {
      console.warn(`[Security] ⚠️ Tentativa de spoofing de OrgID detectada do usuário ${req.user.email}`);
      return res.status(400).json({ error: 'Operação inválida: Tentativa de manipulação de Tenant detectada.' });
    }
  }

  try {
    const supabase = getSupabaseServer();
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', req.orgId)
      .maybeSingle();

    if (error || !organization) {
      console.error(
        `[TenantMiddleware] Tenant inexistente bloqueado: ${req.orgId} em ${req.method} ${req.path}`
      );
      return res.status(403).json({
        error: 'Organizacao nao encontrada ou tenant invalido.',
        code: 'INVALID_TENANT',
      });
    }

    req.orgId = organization.id;
  } catch (error) {
    console.error('[TenantMiddleware] Erro ao validar tenant:', error.message);
    return res.status(500).json({
      error: 'Erro interno ao validar organizacao.',
      code: 'TENANT_VALIDATION_FAILED',
    });
  }

  next();
};
