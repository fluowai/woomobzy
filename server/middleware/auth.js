import {
  getSupabaseAuthServer,
  getSupabaseServer,
} from '../lib/supabase-server.js';
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
    const supabaseAuth = getSupabaseAuthServer();
    const { user, impersonation, authError } = await resolveAuthenticatedUser(
      supabaseAuth,
      supabase,
      token
    );

    if (!user) {
      const authFailure = describeAuthFailure(authError, token);
      console.warn('[Auth] Token rejeitado pelo Supabase', {
        code: authError?.code || null,
        status: authError?.status || null,
        message: authError?.message || 'motivo nao informado',
        ...authFailure,
      });
      return res.status(401).json({
        error: 'Sessão inválida ou expirada',
        code: 'AUTH_SESSION_INVALID',
        auth_failure: authFailure.reason,
        expected_project: authFailure.expectedProject,
        token_issuer: authFailure.tokenIssuer,
      });
    }

    // Buscar perfil real no banco (Fonte de Verdade para Role e Org).
    // Em algumas bases antigas houve usuarios recriados no Supabase Auth,
    // mantendo o perfil pelo e-mail antigo. Nesses casos, resolvemos por e-mail.
    const profile = await resolveProfileForUser(supabase, user);

    if (!profile) {
      console.warn('[Auth] Perfil de usuario nao encontrado', {
        userId: user.id,
        email: maskEmail(user.email),
        issuer: decodeJwtPayload(token)?.iss || null,
        expectedProject: getProjectRef(process.env.VITE_SUPABASE_URL),
      });
      return res
        .status(403)
        .json({
          error: 'Perfil de usuário não encontrado',
          code: 'PROFILE_NOT_FOUND',
        });
    }

    // Injetar dados no request
    req.user = { ...user, id: profile.id || user.id };
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

function describeAuthFailure(authError, token) {
  const message = String(authError?.message || '').toLowerCase();
  let reason = 'TOKEN_REJECTED';

  if (message.includes('api key') || message.includes('apikey')) {
    reason = 'INVALID_SUPABASE_ANON_KEY';
  } else if (message.includes('expired')) {
    reason = 'TOKEN_EXPIRED';
  } else if (message.includes('signature')) {
    reason = 'TOKEN_SIGNATURE_INVALID';
  } else if (message.includes('malformed') || message.includes('segments')) {
    reason = 'TOKEN_MALFORMED';
  }

  const expectedProject = getProjectRef(process.env.VITE_SUPABASE_URL);
  const payload = decodeJwtPayload(token);
  const tokenIssuer = payload?.iss || null;

  if (expectedProject && tokenIssuer && tokenIssuer !== expectedProject) {
    reason = 'SUPABASE_PROJECT_MISMATCH';
  }

  return { reason, expectedProject, tokenIssuer };
}

function getProjectRef(url) {
  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    return payload
      ? JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
      : null;
  } catch {
    return null;
  }
}

function maskEmail(email = '') {
  const [user, domain] = String(email).split('@');
  if (!user || !domain) return null;
  return `${user.slice(0, 2)}***@${domain}`;
}

async function resolveAuthenticatedUser(supabaseAuth, supabaseAdmin, token) {
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token);

  if (!authError && user) {
    return { user, impersonation: null, authError: null };
  }

  const impersonation = await verifyImpersonationToken(supabaseAdmin, token);
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

async function resolveProfileForUser(supabase, user) {
  const { data: profileById, error: profileByIdError } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profileByIdError && profileById) {
    return profileById;
  }

  const email = String(user.email || '').toLowerCase().trim();
  if (!email) return null;

  const { data: profileByEmail, error: profileByEmailError } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id')
    .ilike('email', email)
    .maybeSingle();

  if (!profileByEmailError && profileByEmail) {
    console.warn('[Auth] Perfil resolvido por e-mail apos mismatch de id', {
      email,
      authUserId: user.id,
      profileId: profileByEmail.id,
    });
    return profileByEmail;
  }

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id, name, owner_name, owner_email')
    .ilike('owner_email', email)
    .maybeSingle();

  if (organizationError || !organization) {
    return null;
  }

  const { data: createdProfile, error: createProfileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email,
        name:
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          organization.owner_name ||
          organization.name ||
          email,
        role: 'admin',
        organization_id: organization.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('id, email, role, organization_id')
    .single();

  if (createProfileError) {
    console.error('[Auth] Falha ao criar perfil por owner_email:', createProfileError.message);
    return null;
  }

  console.warn('[Auth] Perfil criado automaticamente para owner_email', {
    email,
    organizationId: organization.id,
  });
  return createdProfile;
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
