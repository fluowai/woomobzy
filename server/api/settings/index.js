import { Router } from 'express';
import { z } from 'zod';
import { verifyAdmin, verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { encryptEmailSecret } from '../../services/email/crypto.js';
import {
  testEmailConnection,
  normalizeEmailConnectionConfig,
} from '../../services/email/emailService.js';

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
  'smtp_config',
  'onboarding_config',
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

router.post('/smtp/test', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const account = normalizeEmailConnectionConfig({
      smtp_host: req.body.host,
      smtp_port: req.body.port,
      smtp_secure: req.body.secure,
      email: req.body.email,
      password: req.body.password,
    });
    await testEmailConnection(account);
    res.json({
      success: true,
      message: 'Conexao SMTP validada com sucesso.',
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.post('/smtp', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { smtp_config } = req.body;
    if (!smtp_config || !smtp_config.host || !smtp_config.email) {
      return res.status(400).json({ error: 'Configuração SMTP inválida.' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('site_settings')
      .select('id, smtp_config')
      .eq('organization_id', req.orgId)
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    // Use existing password if a new one is not provided
    const password =
      smtp_config.password ||
      (existing?.smtp_config?.password_encrypted ? null : '');
    const password_encrypted = smtp_config.password
      ? encryptEmailSecret(smtp_config.password)
      : existing?.smtp_config?.password_encrypted;

    const newSmtpConfig = {
      host: smtp_config.host,
      port: smtp_config.port,
      secure: smtp_config.secure,
      email: smtp_config.email,
      password_encrypted,
    };

    const payload = {
      smtp_config: newSmtpConfig,
      organization_id: req.orgId,
      updated_at: new Date().toISOString(),
    };

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
    });
  } catch (error) {
    console.error('[Settings] Erro ao salvar SMTP:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao salvar configuracoes SMTP.',
    });
  }
});

export default router;
