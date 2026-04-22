import { getSupabaseServer } from '../lib/supabase-server.js';

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada' });
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
    // --- LÓGICA DE IMPERSONATION ---
    // Apenas SuperAdmins podem solicitar impersonação via header
    const impersonateId = req.headers['x-impersonate-org-id'];

    if (impersonateId && profile.role === 'superadmin') {
      console.log(
        `[Auth] 🔐 SuperAdmin ${user.email} impersonando Org: ${impersonateId}`
      );
      req.orgId = impersonateId;
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
export const verifyAdmin = async (req, res, next) => {
  try {
    // Criar wrapper que verifica role após auth
    const authWithRoleCheck = new Promise((resolve, reject) => {
      const originalNext = next;

      // Sobrescrever next para verificar role antes de chamar handler final
      const wrappedNext = (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Após verifyAuth passar, verificar role
        if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
          reject(
            new Error('Acesso negado: Requer privilégios de administrador')
          );
          return;
        }

        resolve(true);
      };

      // Chamar verifyAuth com next Wrapped
      verifyAuth(req, res, wrappedNext);
    });

    await authWithRoleCheck;
    next();
  } catch (e) {
    console.error('[verifyAdmin] Erro:', e.message);
    res
      .status(403)
      .json({
        error:
          e.message || 'Acesso negado: Requer privilégios de administrador',
      });
  }
};

/** Shortcut para rotas restritas ao Dono do SaaS */
export const verifySuperAdmin = async (req, res, next) => {
  try {
    const authWithRoleCheck = new Promise((resolve, reject) => {
      const wrappedNext = (err) => {
        if (err) {
          reject(err);
          return;
        }

        if (req.userRole !== 'superadmin') {
          reject(
            new Error('Acesso negado: Requer privilégios de superadministrador')
          );
          return;
        }

        resolve(true);
      };

      verifyAuth(req, res, wrappedNext);
    });

    await authWithRoleCheck;
    next();
  } catch (e) {
    console.error('[verifySuperAdmin] Erro:', e.message);
    res
      .status(403)
      .json({
        error:
          e.message ||
          'Acesso negado: Requer privilégios de superadministrador',
      });
  }
};
