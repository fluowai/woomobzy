import { Router } from 'express';
import { z } from 'zod';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { resolveEnvironment } from '../../middleware/environment.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';

const router = Router();
const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

const environmentSchema = z.object({
  type: z.enum(['urban', 'rural']),
  name: z.string().min(1).max(100).optional(),
});

const publicColumns = 'id, organization_id, type, name, slug, status, is_primary, brand_config, feature_flags, created_at, updated_at';

const mapEnvironment = (env) => ({
  id: env.id,
  type: env.type,
  name: env.name,
  slug: env.slug,
  status: env.status,
  is_primary: env.is_primary,
  brand_config: env.brand_config || {},
  feature_flags: env.feature_flags || {},
  created_at: env.created_at,
  updated_at: env.updated_at,
});

router.use(verifyAuth, requireTenant);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('environments')
      .select(publicColumns)
      .eq('organization_id', req.orgId)
      .order('is_primary', { ascending: false })
      .order('type', { ascending: true });

    if (error) throw error;
    res.json((data || []).map(mapEnvironment));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/current', async (req, res) => {
  try {
    const type = req.query.type;
    if (type && !['urban', 'rural'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de ambiente invalido' });
    }

    const environment = await resolveEnvironment({
      orgId: req.orgId,
      type: type || null,
    });

    if (!environment) {
      return res.status(404).json({
        error: 'Ambiente precisa ser ativado.',
        code: 'ENVIRONMENT_NOT_FOUND',
      });
    }

    res.json(mapEnvironment(environment));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const validation = environmentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados invalidos', details: validation.error.errors });
    }

    const { type } = validation.data;
    const name = validation.data.name || (type === 'rural' ? 'Imobzy Rural' : 'Imobzy Urbana');
    const slug = type;

    const { data: existing, error: existingError } = await supabase
      .from('environments')
      .select(publicColumns)
      .eq('organization_id', req.orgId)
      .eq('type', type)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return res.status(409).json({
        error: 'Ambiente deste tipo ja existe para esta organizacao.',
        environment: mapEnvironment(existing),
      });
    }

    const { count } = await supabase
      .from('environments')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', req.orgId);

    const { data, error } = await supabase
      .from('environments')
      .insert({
        organization_id: req.orgId,
        type,
        name,
        slug,
        is_primary: (count || 0) === 0,
        brand_config: {},
        feature_flags: {},
      })
      .select(publicColumns)
      .single();

    if (error) throw error;
    res.status(201).json(mapEnvironment(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/activate', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('environments')
      .select(publicColumns)
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Ambiente nao encontrado' });
    }

    res.json(mapEnvironment(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
