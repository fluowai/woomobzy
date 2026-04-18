import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
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
      return res.status(403).json({ error: 'Perfil de usuário não encontrado' });
    }

    // Injetar dados no request
    req.user = user;
    req.userRole = profile.role;
    req.realOrgId = profile.organization_id;
    
    // --- LÓGICA DE IMPERSONATION (BLOCO 3) ---
    // Apenas SuperAdmins podem solicitar impersonação via header
    const impersonateId = req.headers['x-impersonate-org-id'];
    
    if (impersonateId && profile.role === 'superadmin') {
      console.log(`[Auth] 🔐 SuperAdmin ${user.email} impersonando Org: ${impersonateId}`);
      req.orgId = impersonateId;
      req.isImpersonating = true;
    } else {
      req.orgId = profile.organization_id;
      req.isImpersonating = false;
    }

    next();
  } catch (e) {
    console.error('❌ Erro Crítico no AuthMiddleware:', e);
    res.status(500).json({ error: 'Erro interno de segurança' });
  }
};

/** Shortcut para rotas que exigem apenas Admin da própria Org */
export const verifyAdmin = async (req, res, next) => {
  await verifyAuth(req, res, () => {
    if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Acesso negado: Requer privilégios de administrador' });
    }
    next();
  });
};

/** Shortcut para rotas restritas ao Dono do SaaS */
export const verifySuperAdmin = async (req, res, next) => {
  await verifyAuth(req, res, () => {
    if (req.userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Acesso negado: Requer privilégios de superadministrador' });
    }
    next();
  });
};
