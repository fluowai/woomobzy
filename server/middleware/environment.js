import { getSupabaseServer } from '../lib/supabase-server.js';

const VALID_TYPES = new Set(['urban', 'rural']);

const normalizeType = (value) => {
  if (value === 'urbano' || value === 'traditional') return 'urban';
  if (value === 'rural') return 'rural';
  if (value === 'urban') return 'urban';
  return null;
};

export const resolveEnvironment = async ({ orgId, environmentId, type }) => {
  if (!orgId) return null;

  const supabase = getSupabaseServer();
  let query = supabase
    .from('environments')
    .select('id, organization_id, type, name, slug, status, is_primary, brand_config, feature_flags')
    .eq('organization_id', orgId);

  if (environmentId) {
    query = query.eq('id', environmentId);
  } else if (type && VALID_TYPES.has(type)) {
    query = query.eq('type', type);
  } else {
    query = query.eq('is_primary', true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
};

export const requireEnvironment = async (req, res, next) => {
  try {
    const requestedId =
      req.headers['x-environment-id'] ||
      req.query.environment_id ||
      req.body?.environment_id ||
      null;

    const requestedType = normalizeType(
      req.headers['x-environment-type'] ||
      req.query.environment_type ||
      req.query.type ||
      req.body?.environment_type ||
      req.body?.type
    );

    const environment = await resolveEnvironment({
      orgId: req.orgId,
      environmentId: requestedId,
      type: requestedId ? null : requestedType,
    });

    if (!environment) {
      return res.status(404).json({
        error: 'Ambiente nao encontrado ou nao ativado para esta organizacao.',
        code: 'ENVIRONMENT_NOT_FOUND',
      });
    }

    if (environment.organization_id !== req.orgId) {
      return res.status(403).json({
        error: 'Acesso negado: ambiente pertence a outra organizacao.',
        code: 'ENVIRONMENT_FORBIDDEN',
      });
    }

    if (requestedId && requestedType && environment.type !== requestedType) {
      return res.status(403).json({
        error: 'Ambiente informado nao corresponde ao tipo de painel acessado.',
        code: 'ENVIRONMENT_TYPE_MISMATCH',
      });
    }

    req.environment = environment;
    req.environmentId = environment.id;
    next();
  } catch (error) {
    console.error('[EnvironmentMiddleware] erro ao validar ambiente:', error);
    res.status(500).json({ error: 'Erro ao validar ambiente' });
  }
};
