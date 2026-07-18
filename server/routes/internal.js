import express from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  getSupabaseAuthServer,
  getSupabaseServer,
} from '../lib/supabase-server.js';

const router = express.Router();

router.get('/auth-debug', async (req, res) => {
  const startedAt = Date.now();
  const authorization = req.headers.authorization || '';
  const bearerToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';

  if (!isDebugAccessAllowed(req, bearerToken)) {
    return res.status(401).json({
      finalStatus: 'FAIL',
      error: 'AUTH_DEBUG_UNAUTHORIZED',
    });
  }

  const diagnostics = {
    env: getSupabaseEnvDiagnostics(),
    supabase: {
      serviceKeyValid: false,
      serviceDbReachable: false,
      anonKeyValid: false,
      anonDbReachable: false,
      projectConsistent: false,
      errors: [],
    },
    auth: {
      tokenProvided: Boolean(bearerToken),
      tokenValid: false,
      userId: null,
      email: null,
      tokenIssuer: null,
      tokenProjectRef: null,
      error: null,
    },
    profile: {
      exists: false,
      id: null,
      role: null,
      organizationId: null,
      error: null,
    },
    organization: {
      exists: false,
      id: null,
      active: false,
      status: null,
      error: null,
    },
    request: {
      path: req.path,
      hasAuthorization: Boolean(authorization),
      hasOrganizationHeader: Boolean(req.headers['x-organization-id']),
      hasImpersonationHeader: Boolean(req.headers['x-impersonate-org-id']),
    },
    finalStatus: 'FAIL',
  };

  diagnostics.supabase.projectConsistent = inferProjectConsistency(
    diagnostics.env
  );

  await checkSupabaseClients(diagnostics);
  await checkJwtAndTenantChain(diagnostics, bearerToken);

  diagnostics.finalStatus = getFinalStatus(diagnostics);
  diagnostics.durationMs = Date.now() - startedAt;

  const statusCode = diagnostics.finalStatus === 'FAIL' ? 500 : 200;
  return res.status(statusCode).json(diagnostics);
});

export function isDebugAccessAllowed(req, bearerToken) {
  const configuredToken = String(
    process.env.INTERNAL_AUTH_DEBUG_TOKEN || ''
  ).trim();
  if (configuredToken) {
    const providedToken = String(
      req.headers['x-internal-debug-token'] ||
        req.headers['x-auth-debug-token'] ||
        bearerToken ||
        ''
    ).trim();

    return providedToken === configuredToken;
  }

  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  return Boolean(bearerToken);
}

function getSupabaseEnvDiagnostics() {
  const supabaseUrl =
    getEnvValue('VITE_SUPABASE_URL') || getEnvValue('SUPABASE_URL');
  const anonKey =
    getEnvValue('VITE_SUPABASE_ANON_KEY') || getEnvValue('SUPABASE_ANON_KEY');
  const serviceKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');
  const anonKeyInfo = describeSupabaseKey(anonKey);
  const serviceKeyInfo = describeSupabaseKey(serviceKey);

  return {
    supabaseUrlPresent: Boolean(supabaseUrl),
    supabaseUrlValid: isValidUrl(supabaseUrl),
    supabaseProjectRef: getProjectRef(supabaseUrl),
    anonKeyPresent: Boolean(anonKey),
    anonKeyLooksValid: isUsableAnonKey(anonKeyInfo),
    anonKeyPrefix: safePrefix(anonKey),
    anonKeyKind: anonKeyInfo.kind,
    anonKeyRole: anonKeyInfo.role || null,
    anonKeyProjectRef: anonKeyInfo.jwtRef || null,
    serviceKeyPresent: Boolean(serviceKey),
    serviceKeyLooksValid: isUsableServiceKey(serviceKeyInfo),
    serviceKeyPrefix: safePrefix(serviceKey),
    serviceKeyKind: serviceKeyInfo.kind,
    serviceKeyRole: serviceKeyInfo.role || null,
    serviceKeyProjectRef: serviceKeyInfo.jwtRef || null,
    serviceRoleConfiguredSeparately: Boolean(
      serviceKey && serviceKey !== anonKey
    ),
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}

async function checkSupabaseClients(diagnostics) {
  try {
    const serviceClient = getSupabaseServer();
    const { error } = await serviceClient
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    diagnostics.supabase.serviceKeyValid = !isInvalidApiKeyError(error);
    diagnostics.supabase.serviceDbReachable = !error;
    if (error) diagnostics.supabase.errors.push(toErrorInfo('service', error));
  } catch (error) {
    diagnostics.supabase.errors.push(toErrorInfo('service', error));
  }

  try {
    const url = getEnvValue('VITE_SUPABASE_URL') || getEnvValue('SUPABASE_URL');
    const anonKey =
      getEnvValue('VITE_SUPABASE_ANON_KEY') || getEnvValue('SUPABASE_ANON_KEY');
    if (!url || !anonKey) {
      diagnostics.supabase.errors.push({
        source: 'anon',
        message: 'Missing Supabase URL or anon key',
      });
      return;
    }

    const anonClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { error } = await anonClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    diagnostics.supabase.anonKeyValid = !isInvalidApiKeyError(error);
    diagnostics.supabase.anonDbReachable = !error;
    if (error) diagnostics.supabase.errors.push(toErrorInfo('anon', error));
  } catch (error) {
    diagnostics.supabase.errors.push(toErrorInfo('anon', error));
  }
}

async function checkJwtAndTenantChain(diagnostics, bearerToken) {
  if (!bearerToken) {
    diagnostics.auth.error = 'MISSING_BEARER_TOKEN';
    return;
  }

  const tokenPayload = decodeJwtPayload(bearerToken);
  diagnostics.auth.tokenIssuer = tokenPayload?.iss || null;
  diagnostics.auth.tokenProjectRef = getProjectRef(tokenPayload?.iss);

  let user = null;
  try {
    const authClient = getSupabaseAuthServer();
    const { data, error } = await authClient.auth.getUser(bearerToken);

    if (error || !data?.user) {
      diagnostics.auth.error = error?.message || 'TOKEN_REJECTED';
      return;
    }

    user = data.user;
    diagnostics.auth.tokenValid = true;
    diagnostics.auth.userId = user.id;
    diagnostics.auth.email = maskEmail(user.email);
  } catch (error) {
    diagnostics.auth.error = error.message;
    return;
  }

  try {
    const serviceClient = getSupabaseServer();
    const profile = await findProfile(serviceClient, user);
    if (!profile) {
      diagnostics.profile.error = 'PROFILE_NOT_FOUND';
      return;
    }

    diagnostics.profile.exists = true;
    diagnostics.profile.id = profile.id;
    diagnostics.profile.role = profile.role || null;
    diagnostics.profile.organizationId = profile.organization_id || null;

    if (!profile.organization_id) {
      diagnostics.profile.error =
        profile.role === 'superadmin' ? null : 'PROFILE_NO_ORG';
      return;
    }

    const { data: organization, error: orgError } = await serviceClient
      .from('organizations')
      .select('id, status')
      .eq('id', profile.organization_id)
      .maybeSingle();

    if (orgError) {
      diagnostics.organization.error = orgError.message;
      return;
    }

    if (!organization) {
      diagnostics.organization.error = 'ORG_NOT_FOUND';
      return;
    }

    diagnostics.organization.exists = true;
    diagnostics.organization.id = organization.id;
    diagnostics.organization.status = organization.status || null;
    diagnostics.organization.active =
      !organization.status || organization.status === 'active';
  } catch (error) {
    diagnostics.profile.error = diagnostics.profile.error || error.message;
  }
}

async function findProfile(supabase, user) {
  const { data: byId, error: byIdError } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!byIdError && byId) return byId;

  const email = String(user.email || '')
    .toLowerCase()
    .trim();
  if (!email) return null;

  const { data: byEmail, error: byEmailError } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id')
    .ilike('email', email)
    .maybeSingle();

  if (!byEmailError && byEmail) return byEmail;
  return null;
}

function getFinalStatus(diagnostics) {
  if (!diagnostics.env.supabaseUrlValid) return 'FAIL';
  if (!diagnostics.supabase.serviceKeyValid) return 'FAIL';
  if (diagnostics.auth.tokenProvided && !diagnostics.auth.tokenValid)
    return 'FAIL';
  if (diagnostics.auth.tokenValid && !diagnostics.profile.exists) return 'FAIL';
  if (
    diagnostics.profile.exists &&
    diagnostics.profile.role !== 'superadmin' &&
    !diagnostics.profile.organizationId
  ) {
    return 'FAIL';
  }
  if (diagnostics.profile.organizationId && !diagnostics.organization.exists)
    return 'FAIL';
  if (diagnostics.organization.exists && !diagnostics.organization.active)
    return 'FAIL';
  if (!diagnostics.supabase.projectConsistent) return 'WARN';
  if (!diagnostics.supabase.anonKeyValid) return 'WARN';
  if (!diagnostics.supabase.anonDbReachable) return 'WARN';
  if (!diagnostics.auth.tokenProvided) return 'WARN';
  return 'OK';
}

function inferProjectConsistency(env) {
  const urlProject = env.supabaseProjectRef;
  if (!urlProject) return false;
  if (env.anonKeyProjectRef && env.anonKeyProjectRef !== urlProject)
    return false;
  if (env.serviceKeyProjectRef && env.serviceKeyProjectRef !== urlProject)
    return false;
  return true;
}

function getEnvValue(name) {
  return String(process.env[name] || '').trim();
}

function safePrefix(value) {
  if (!value) return null;
  return `${value.slice(0, 12)}...${value.slice(-4)}`;
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isUsableAnonKey(info) {
  if (info.kind === 'publishable') return true;
  return info.kind === 'jwt' && info.role === 'anon';
}

function isUsableServiceKey(info) {
  if (info.kind === 'secret') return true;
  return info.kind === 'jwt' && info.role === 'service_role';
}

function describeSupabaseKey(value) {
  if (!value) return { kind: 'missing' };
  if (value.startsWith('sb_publishable_')) return { kind: 'publishable' };
  if (value.startsWith('sb_secret_')) return { kind: 'secret' };

  const parts = value.split('.');
  if (parts.length !== 3) return { kind: 'unknown' };

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    );
    return {
      kind: 'jwt',
      role: payload.role || null,
      jwtRef: payload.ref || null,
      issuer: payload.iss || null,
    };
  } catch {
    return { kind: 'unknown' };
  }
}

function isInvalidApiKeyError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('invalid api key') || message.includes('invalid apikey')
  );
}

function toErrorInfo(source, error) {
  return {
    source,
    message: error?.message || String(error),
    code: error?.code || null,
    status: error?.status || null,
  };
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

function getProjectRef(url) {
  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

function maskEmail(email = '') {
  const [user, domain] = String(email).split('@');
  if (!user || !domain) return null;
  return `${user.slice(0, 2)}***@${domain}`;
}

export default router;
