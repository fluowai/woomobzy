/**
 * server/middleware/tenant.js
 * 
 * Middleware de Garantia de Tenant.
 * Deve ser usado após verifyAuth/verifyAdmin.
 */
export const requireTenant = (req, res, next) => {
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

  next();
};
