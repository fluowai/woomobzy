import { getSupabaseServer } from '../lib/supabase-server.js';
import jwt from 'jsonwebtoken';

/**
 * Middleware Central de Autenticação e Resolução de Tenant
 * GARANTE:
 * 1. Token válido
 * 2. Perfil carregado
 * 3. req.orgId definido (Fonte Única de Verdade)
 * 4. Suporte a Impersonation para SuperAdmins
 */
export const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Não autorizado: Token ausente' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const supabase = getSupabaseServer();
    const { user, impersonation, authError } = await resolveAuthenticatedUser(supabase, token);

    if (!user) {
      console.warn('[Auth] Token rejeitado pelo Supabase', {
        code: authError?.code || null,
        status: authError?.status || null,
        message: authError?.message || 'motivo nao informado',
      });
      return res.status(401).json({
        error: 'Sessão inválida ou expirada',
        code: 'AUTH_SESSION_INVALID',
      });
    }

    // Buscar perfil real no banco (Fonte de Verdade para Role e Org)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res
        .status(403)
        .json({ error: 'Perfil de usuário não encontrado' });
    }

    // Injetar dados no request
    req.user = user;
    req.userRole = profile.role;
    req.realOrgId = profile.organization_id;
    req.impersonation = impersonation;
    // --- LÓGICA DE IMPERSONATION ---
    // Apenas SuperAdmins podem solicitar impersonação via header
    const impersonateId = req.headers['x-impersonate-org-id'];

    if (impersonateId && profile.role === 'superadmin') {
      const { data: impersonatedOrg, error: impersonatedOrgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', impersonateId)
        .maybeSingle();

      if (impersonatedOrgError || !impersonatedOrg) {
        console.warn(
          `[Auth] Impersonation invalida bloqueada para ${user.email}: ${impersonateId}`
        );
        return res.status(403).json({
          error: 'Organizacao impersonada nao encontrada.',
          code: 'INVALID_IMPERSONATED_ORG',
        });
      }

      console.log(
        `[Auth] 🔐 SuperAdmin ${user.email} impersonando Org: ${impersonateId}`
      );
      req.orgId = impersonatedOrg.id;
      req.isImpersonating = true;
    } else {
      req.orgId = profile.organization_id;
      req.isImpersonating = false;
    }

    // Se for superadmin e não estiver impersonando, req.orgId pode ser nulo para rotas globais
    // Mas para rotas de tenant (leads, props), next middlewares farão o check se necessário

    next();
  } catch (e) {
    console.error('❌ Erro Crítico no AuthMiddleware:', e);
    res.status(500).json({ error: 'Erro interno de segurança' });
  }
};

async function resolveAuthenticatedUser(supabase, token) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (!authError && user) {
    return { user, impersonation: null, authError: null };
  }

  const impersonation = await verifyImpersonationToken(supabase, token);
  if (!impersonation) {
    return { user: null, impersonation: null, authError };
  }

  return {
    user: {
      id: impersonation.sub,
      email: impersonation.email,
      app_metadata: impersonation.app_metadata || {},
      user_metadata: impersonation.user_metadata || {},
    },
    impersonation,
    authError: null,
  };
}

async function verifyImpersonationToken(supabase, token) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret, {
      audience: 'authenticated',
    });

    if (
      payload?.role !== 'authenticated' ||
      payload?.app_metadata?.provider !== 'impersonation' ||
      !payload.sub ||
      !payload.app_metadata?.impersonation_session
    ) {
      return null;
    }

    const { data: session, error } = await supabase
      .from('impersonation_sessions')
      .select('id, status, expires_at')
      .eq('id', payload.app_metadata.impersonation_session)
      .maybeSingle();

    if (
      error ||
      !session ||
      session.status !== 'active' ||
      new Date(session.expires_at).getTime() <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Wrapper para verificar role APÓS autenticação bem-sucedida
 * Uso: router.get('/rota', verifyAuth, requireRole('admin'), handler)
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ error: 'Autenticação requerida' });
    }

    if (!allowedRoles.includes(req.userRole)) {
      console.warn(
        `[Auth] 🚫 Acesso negado para role ${req.userRole}. Roles permitidas: ${allowedRoles.join(', ')}`
      );
      return res
        .status(403)
        .json({ error: 'Acesso negado: Privilegios insuficientes' });
    }

    next();
  };
};

/** Shortcut para rotas que exigem apenas Admin da própria Org */
export const verifyAdmin = (req, res, next) => {
  verifyAuth(req, res, (err) => {
    if (err) return next(err);

    if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
      return res.status(403).json({
        error: 'Acesso negado: Requer privilégios de administrador',
      });
    }

    next();
  });
};

/** Shortcut para rotas restritas ao Dono do SaaS */
export const verifySuperAdmin = (req, res, next) => {
  verifyAuth(req, res, (err) => {
    if (err) return next(err);

    if (req.userRole !== 'superadmin') {
      return res.status(403).json({
        error: 'Acesso negado: Requer privilégios de superadministrador',
      });
    }

    next();
  });
};
