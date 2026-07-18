import { Router } from 'express';
import { verifyAdmin, verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';

const router = Router();
const supabase = new Proxy(
  {},
  {
    get: (_, prop) => {
      const client = getSupabaseServer();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

const SITE_SETTING_FIELDS = new Set([
  'agency_name',
  'primary_color',
  'secondary_color',
  'header_color',
  'logo_url',
  'footer_text',
  'social_links',
  'facebook_url',
  'instagram_url',
  'whatsapp_url',
  'youtube_url',
  'linkedin_url',
  'layout_config',
  'integrations',
  'contact_email',
  'contact_phone',
  'updated_at',
]);

function pickSiteSettingsPayload(body = {}) {
  const payload = Object.fromEntries(
    Object.entries(body).filter(([key]) => SITE_SETTING_FIELDS.has(key))
  );

  if (payload.integrations?.orulo) {
    payload.integrations = {
      ...payload.integrations,
      orulo: {
        enabled: payload.integrations.orulo.enabled,
      },
    };
  }

  return payload;
}

function getMissingSchemaColumn(error) {
  if (error?.code !== 'PGRST204') return null;
  const message = String(error?.message || '');
  return message.match(/'([^']+)' column/)?.[1] || null;
}

async function saveWithSchemaFallback(operationFactory, payload) {
  const ignoredMissingColumns = [];
  const workingPayload = { ...payload };

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await operationFactory(workingPayload);

    if (!error) {
      return { data, ignoredMissingColumns };
    }

    const missingColumn = getMissingSchemaColumn(error);
    if (!missingColumn || !(missingColumn in workingPayload)) {
      throw error;
    }

    delete workingPayload[missingColumn];
    ignoredMissingColumns.push(missingColumn);
  }

  throw new Error('Nao foi possivel salvar configuracoes do site.');
}

router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (error) throw error;

    return res.json({
      success: true,
      settings: data || null,
    });
  } catch (error) {
    console.error('[Settings] Erro ao carregar configuracoes:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao carregar configuracoes.',
    });
  }
});

router.put('/', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const payload = {
      ...pickSiteSettingsPayload(req.body),
      organization_id: req.orgId,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabase
      .from('site_settings')
      .select('id')
      .eq('organization_id', req.orgId)
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    const result = await saveWithSchemaFallback((workingPayload) => {
      if (existing?.id) {
        return supabase
          .from('site_settings')
          .update(workingPayload)
          .eq('id', existing.id)
          .eq('organization_id', req.orgId)
          .select()
          .single();
      }

      return supabase
        .from('site_settings')
        .insert(workingPayload)
        .select()
        .single();
    }, payload);

    return res.json({
      success: true,
      settings: result.data,
      ignoredMissingColumns: result.ignoredMissingColumns,
    });
  } catch (error) {
    console.error('[Settings] Erro ao salvar configuracoes:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao salvar configuracoes.',
    });
  }
});

export default router;
