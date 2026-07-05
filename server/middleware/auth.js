import {
  getSupabaseAuthServer,
  getSupabaseServer,
} from '../lib/supabase-server.js';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import { TtlCache } from '../lib/ttl-cache.js';

const AUTH_CACHE_TTL_MS = 60_000;
const authenticatedUserCache = new TtlCache(AUTH_CACHE_TTL_MS);
const profileCache = new TtlCache(AUTH_CACHE_TTL_MS);
const organizationCache = new TtlCache(AUTH_CACHE_TTL_MS);
const isProduction = process.env.NODE_ENV === 'production';

function authDebug(message, data) {
  if (!isProduction) console.debug(`[AUTH DEBUG] ${message}`, data);
}

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
    const profileCacheKey = `${user.id}:${String(user.email || '').toLowerCase()}`;
    const profile = await profileCache.getOrLoad(
      profileCacheKey,
      () => resolveProfileForUser(supabase, user)
    );

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

    const effectiveProfileEmail = String(profile.email || user.email || '')
      .toLowerCase()
      .trim();

    // Break-glass final: em producao ja vimos tokens/perfis antigos chegarem
    // sem metadata de role, mesmo com o perfil correto no banco.
    if (effectiveProfileEmail === 'fluowai@gmail.com') {
      if (profile.role !== 'superadmin' || profile.organization_id) {
        console.warn('[Auth] Break-glass superadmin aplicado ao dono do sistema', {
          userId: user.id,
          profileId: profile.id,
          previousRole: profile.role,
          previousOrg: profile.organization_id || null,
        });
      }
      profile.role = 'superadmin';
      profile.organization_id = null;
    }

    // Injetar dados no request
    req.user = { ...user, id: profile.id || user.id };
    req.userRole = profile.role;
    req.realOrgId = profile.organization_id;
    req.impersonation = impersonation;

    const impersonateId = req.headers['x-impersonate-org-id'];
    const requestedOrgId = req.headers['x-organization-id'];
    const tokenImpersonationOrgId = getImpersonationTenantId(impersonation);

    authDebug('verifyAuth', {
      userId: profile.id,
      email: maskEmail(profile.email),
      role: profile.role,
      profileOrg: profile.organization_id,
      requestedOrg: requestedOrgId,
      impersonateId: impersonateId || null,
      authorizationExists: !!req.headers.authorization,
    });

    if (tokenImpersonationOrgId) {
      req.orgId = tokenImpersonationOrgId;
      req.isImpersonating = true;
      authDebug('Token impersonation ativo', { orgId: req.orgId });
    } else if (impersonateId && profile.role === 'superadmin') {
      authDebug('Superadmin impersonando via header', { impersonateId });
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
      req.tenantValidated = true;
    } else if (profile.role === 'superadmin' && requestedOrgId) {
      authDebug('Superadmin acessando org via header', { requestedOrgId });
      const requestedOrg = await resolveOrganizationById(supabase, requestedOrgId);
      if (!requestedOrg) {
        console.warn('[Auth] Organizacao solicitada no header nao encontrada', {
          userId: user.id,
          email: maskEmail(user.email),
          requestedOrgId,
        });
        return res.status(403).json({
          error: 'Organizacao solicitada nao permitida para este usuario.',
          code: 'INVALID_REQUESTED_ORG',
        });
      }
      req.orgId = requestedOrg.id;
      req.isImpersonating = true;
      req.tenantValidated = true;
    } else if (profile.organization_id) {
      // Usuario comum/admin: usa APENAS a organizacao do perfil.
      // Ignora completamente o header x-organization-id para evitar erros com dados stale.
      authDebug('Usuario admin, usando org do profile', {
        profileOrg: profile.organization_id,
        requestedOrgIgnored: requestedOrgId || null,
      });
      const org = await resolveOrganizationById(supabase, profile.organization_id);
      if (!org) {
        console.warn('[Auth] Organizacao do perfil nao encontrada no banco', {
          userId: user.id,
          email: maskEmail(user.email),
          profileOrgId: profile.organization_id,
        });
        return res.status(403).json({
          error: 'Organizacao do perfil nao encontrada.',
          code: 'PROFILE_ORG_NOT_FOUND',
        });
      }
      if (org.status && org.status !== 'active') {
        console.warn('[Auth] Organizacao do perfil esta inativa', {
          userId: user.id,
          email: maskEmail(user.email),
          profileOrgId: profile.organization_id,
          status: org.status,
        });
        return res.status(403).json({
          error: 'Organizacao do perfil esta inativa.',
          code: 'PROFILE_ORG_INACTIVE',
        });
      }
      req.orgId = org.id;
      req.isImpersonating = false;
      req.tenantValidated = true;
    } else if (profile.role === 'superadmin') {
      authDebug('Superadmin acessando sem org vinculada/solicitada');
      req.orgId = null;
      req.isImpersonating = false;
    } else {
      console.warn('[Auth] Perfil sem organizacao vinculada, tentando resolver organizacao existente', {
        userId: user.id,
        profileId: profile.id,
        email: maskEmail(user.email),
        role: profile.role,
      });

      const profileEmail = profile.email || user.email;
      if (profileEmail) {
        const normalizedEmail = String(profileEmail).toLowerCase().trim();
        const existingOrg = await findExistingOrganizationForUser(
          supabase,
          user,
          normalizedEmail,
          requestedOrgId
        );

        if (existingOrg?.id) {
          authDebug('Org existente encontrada, vinculando ao perfil', {
            userId: user.id,
            profileId: profile.id,
            orgId: existingOrg.id,
          });

          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({
              organization_id: existingOrg.id,
              role: 'admin',
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id)
            .select('id, email, role, organization_id')
            .single();

          if (!updateError && updatedProfile) {
            req.user = { ...user, id: updatedProfile.id || user.id };
            req.userRole = updatedProfile.role;
            req.realOrgId = updatedProfile.organization_id;
            req.orgId = existingOrg.id;
            req.isImpersonating = false;
            authDebug('Organizacao existente vinculada automaticamente', {
              userId: user.id,
              orgId: existingOrg.id,
            });
            return next();
          }

          // Profile update failed but org exists — proceed anyway to avoid blocking user
          console.warn('[Auth] Profile update falhou mas org existe, prosseguindo', {
            userId: user.id,
            profileId: profile.id,
            orgId: existingOrg.id,
            updateError: updateError?.message || 'sem dados retornados',
          });
          req.user = { ...user, id: profile.id || user.id };
          req.userRole = profile.role || 'admin';
          req.realOrgId = existingOrg.id;
          req.orgId = existingOrg.id;
          req.isImpersonating = false;
          return next();
        } else {
          console.warn('[Auth] Nenhuma organizacao existente encontrada para vincular', {
            userId: user.id,
            email: maskEmail(normalizedEmail),
          });
        }
      } else {
        console.warn('[Auth] Perfil sem email para resolver organizacao', {
          userId: user.id,
          profileId: profile.id,
        });
      }

      console.warn('[Auth] Perfil sem organizacao vinculada - todas tentativas falharam', {
        userId: user.id,
        email: maskEmail(user.email),
        role: profile.role,
      });
      return res.status(403).json({
        error: 'Perfil sem organizacao vinculada.',
        code: 'PROFILE_NO_ORG',
      });
    }

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
  const tokenProject = getProjectRef(tokenIssuer);

  if (expectedProject && tokenIssuer && tokenProject !== expectedProject) {
    reason = 'SUPABASE_PROJECT_MISMATCH';
  }

  return { reason, expectedProject, tokenIssuer, tokenProject };
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

async function resolveOrganizationById(supabase, organizationId) {
  if (!organizationId) return null;
  return organizationCache.getOrLoad(organizationId, async () => {
    authDebug('resolveOrganizationById', { organizationId });
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('id, status')
      .eq('id', organizationId)
      .maybeSingle();

    authDebug('ORG LOOKUP', {
      orgId: organizationId,
      found: !!organization,
      status: organization?.status || null,
      error: error?.message || null,
    });

    if (error || !organization) return undefined;
    return organization;
  });
}

function maskEmail(email = '') {
  const [user, domain] = String(email).split('@');
  if (!user || !domain) return null;
  return `${user.slice(0, 2)}***@${domain}`;
}

async function resolveAuthenticatedUser(supabaseAuth, supabaseAdmin, token) {
  const tokenKey = createHash('sha256').update(token).digest('hex');
  let authError = null;
  const authenticated = await authenticatedUserCache.getOrLoad(tokenKey, async () => {
    const result = await supabaseAuth.auth.getUser(token);
    authError = result.error;
    if (result.error || !result.data.user) return undefined;
    return {
      user: result.data.user,
      impersonation: null,
      authError: null,
    };
  });

  if (authenticated) return authenticated;

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
  const email = String(user.email || '').toLowerCase().trim();

  let metadataRole = normalizeRole(
    user.app_metadata?.role ||
      user.user_metadata?.role ||
      user.app_metadata?.user_role ||
      user.user_metadata?.user_role
  );

  // BREAK-GLASS RECOVERY: Se for o dono do sistema, garantir que é superadmin
  // mesmo que o token ou o banco de dados tenham se corrompido ou sido rebaixados.
  if (email === 'fluowai@gmail.com') {
    metadataRole = 'superadmin';
  }

  const { data: profileById, error: profileByIdError } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profileByIdError && profileById) {
    // FIX: Se o metadata diz que o usuário é superadmin, nós forçamos o role
    // caso ele tenha sido rebaixado por engano pelo bug de auto-criação anterior.
    if (metadataRole === 'superadmin' && profileById.role !== 'superadmin') {
      profileById.role = 'superadmin';
    }
    return completeProfileOrganization(supabase, user, profileById, {
      email: String(profileById.email || user.email || '').toLowerCase().trim(),
      source: 'profile.id',
    });
  }
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
    if (metadataRole === 'superadmin' && profileByEmail.role !== 'superadmin') {
      profileByEmail.role = 'superadmin';
    }
    return completeProfileOrganization(supabase, user, profileByEmail, {
      email,
      source: 'profile.email',
    });
  }

  const metadataOrgId = String(
    user.app_metadata?.organization_id ||
      user.user_metadata?.organization_id ||
      user.app_metadata?.org_id ||
      user.user_metadata?.org_id ||
      ''
  ).trim();

  if (metadataRole === 'superadmin') {
    const profile = await createProfileForUser(supabase, user, {
      email,
      organizationId: null,
      name: user.user_metadata?.name || user.user_metadata?.full_name || email,
      role: 'superadmin',
      source: 'auth_metadata.role',
    });

    if (profile) return profile;
  }

  if (metadataOrgId) {
    const { data: metadataOrg, error: metadataOrgError } = await supabase
      .from('organizations')
      .select('id, name, owner_name')
      .eq('id', metadataOrgId)
      .maybeSingle();

    if (!metadataOrgError && metadataOrg) {
      const profile = await createProfileForUser(supabase, user, {
        email,
        organizationId: metadataOrg.id,
        name: metadataOrg.owner_name || metadataOrg.name,
        role: metadataRole || 'admin',
        source: 'auth_metadata.organization_id',
      });

      if (profile) return profile;
    } else {
      console.warn('[Auth] organization_id do auth metadata nao existe', {
        authUserId: user.id,
        organizationId: metadataOrgId,
        error: metadataOrgError?.message || null,
      });
    }
  }

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id, name, owner_name, owner_email')
    .ilike('owner_email', email)
    .maybeSingle();

  if (organizationError || !organization) {
    console.warn('[Auth] Nenhuma organizacao existente encontrada pelo email; criando perfil sem org', {
      email,
      authUserId: user.id,
    });

    const createdProfile = await createProfileForUser(supabase, user, {
      email,
      organizationId: null,
      name: user.user_metadata?.name || user.user_metadata?.full_name || email.split('@')[0] || email,
      role: 'user',
      source: 'fallback_minimo',
    });

    if (createdProfile) return createdProfile;

    console.warn('[Auth] Criação de perfil no banco falhou; usando perfil virtual para nao bloquear usuario', {
      email,
      authUserId: user.id,
    });

    return {
      id: user.id,
      email,
      role: 'user',
      organization_id: null,
    };
  }

  const createdProfile = await createProfileForUser(supabase, user, {
    email,
    organizationId: organization.id,
    name: organization.owner_name || organization.name,
    role: 'admin',
    source: 'organization.owner_email',
  });

  if (createdProfile) return createdProfile;

  console.warn('[Auth] Criação de perfil no banco falhou apos encontrar organizacao; usando perfil virtual', {
    email,
    authUserId: user.id,
    organizationId: organization.id,
  });

  return {
    id: user.id,
    email,
    role: 'admin',
    organization_id: organization.id,
  };
}

async function completeProfileOrganization(supabase, user, profile, { email, source }) {
  if (profile.organization_id || profile.role === 'superadmin') {
    return profile;
  }

  const metadataOrgId = String(
    user.app_metadata?.organization_id ||
      user.user_metadata?.organization_id ||
      user.app_metadata?.org_id ||
      user.user_metadata?.org_id ||
      ''
  ).trim();

  let organization = null;

  if (metadataOrgId) {
    const { data: metadataOrg, error: metadataOrgError } = await supabase
      .from('organizations')
      .select('id, name, owner_name, owner_email')
      .eq('id', metadataOrgId)
      .maybeSingle();

    if (!metadataOrgError && metadataOrg) {
      organization = metadataOrg;
    } else {
      console.warn('[Auth] organization_id do auth metadata nao existe para perfil existente', {
        authUserId: user.id,
        profileId: profile.id,
        organizationId: metadataOrgId,
        source,
        error: metadataOrgError?.message || null,
      });
    }
  }

  if (!organization && email) {
    const { data: ownerOrg, error: ownerOrgError } = await supabase
      .from('organizations')
      .select('id, name, owner_name, owner_email')
      .ilike('owner_email', email)
      .maybeSingle();

    if (!ownerOrgError && ownerOrg) {
      organization = ownerOrg;
    }
  }

  if (!organization?.id) {
    return profile;
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({
      organization_id: organization.id,
      role: normalizeRole(profile.role) || 'admin',
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
    .select('id, email, role, organization_id')
    .single();

  if (updateError) {
    console.warn('[Auth] Falha ao completar organization_id do perfil existente', {
      authUserId: user.id,
      profileId: profile.id,
      organizationId: organization.id,
      source,
      error: updateError.message,
    });
    return { ...profile, organization_id: organization.id };
  }

  console.warn('[Auth] Perfil existente vinculado automaticamente a organizacao', {
    authUserId: user.id,
    profileId: profile.id,
    organizationId: organization.id,
    source,
  });

  return updatedProfile;
}

function normalizeRole(role) {
  const normalized = String(role || '').toLowerCase().trim();
  if (normalized === 'superadmin') return 'superadmin';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'gerente') return 'gerente';
  if (normalized === 'broker') return 'broker';
  if (normalized === 'assistente') return 'assistente';
  if (normalized === 'user') return 'user';
  return null;
}

async function findExistingOrganizationForUser(supabase, user, email, requestedOrgId = null) {
  const metadataOrgId = String(
    requestedOrgId ||
      user.app_metadata?.organization_id ||
      user.user_metadata?.organization_id ||
      user.app_metadata?.org_id ||
      user.user_metadata?.org_id ||
      ''
  ).trim();

  if (metadataOrgId) {
    const { data: metadataOrg, error: metadataOrgError } = await supabase
      .from('organizations')
      .select('id, name, owner_name, owner_email')
      .eq('id', metadataOrgId)
      .maybeSingle();

    if (!metadataOrgError && metadataOrg) return metadataOrg;
  }

  if (!email) return null;

  const { data: orgByEmail, error: orgByEmailError } = await supabase
    .from('organizations')
    .select('id, name, owner_name, owner_email')
    .ilike('owner_email', email)
    .limit(1)
    .maybeSingle();

  if (!orgByEmailError && orgByEmail) return orgByEmail;

  return null;
}

async function createProfileForUser(supabase, user, { email, organizationId, name, role, source }) {
  const { data: createdProfile, error: createProfileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email,
        name:
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          name ||
          email,
        role: normalizeRole(role) || 'admin',
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('id, email, role, organization_id')
    .single();

  if (createProfileError) {
    console.error(`[Auth] Falha ao criar perfil (source: ${source}):`, createProfileError.message, {
      email,
      source,
      organizationId,
      role,
      userId: user.id,
    });
    return null;
  }

  console.warn('[Auth] Perfil criado automaticamente', {
    email,
    organizationId,
    role: normalizeRole(role) || 'admin',
    source,
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
      .select('id, status, expires_at, tenant_id')
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

    const tokenTenantId = String(payload.app_metadata?.tenant_id || '').trim();
    if (!tokenTenantId || session.tenant_id !== tokenTenantId) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getImpersonationTenantId(impersonation) {
  const tenantId = String(impersonation?.app_metadata?.tenant_id || '').trim();
  return tenantId || null;
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

/** Limpa o cache de perfil para forcar recarga na proxima requisicao */
export function clearProfileCache(userId, email) {
  const cacheKey = `${userId}:${String(email || '').toLowerCase()}`;
  profileCache.delete(cacheKey);
  console.log('[Auth] Cache de perfil limpo para', cacheKey);
}

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
