import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { encrypt, decrypt } from '../../lib/crypto.js';
import { validateCredentials, invalidateClientCache } from './client.js';
import logger from '../../utils/logger.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { instanceId, phoneNumberId, businessAccountId, appId, appSecret, accessToken, apiVersion } = req.body;
    const tenantId = req.orgId;

    if (!instanceId || !phoneNumberId || !businessAccountId || !appId || !appSecret || !accessToken) {
      return res.status(400).json({ error: 'Campos obrigatórios: instanceId, phoneNumberId, businessAccountId, appId, appSecret, accessToken' });
    }

    const validation = await validateCredentials({ phoneNumberId, accessToken, appId, appSecret });
    if (!validation.valid) {
      return res.status(400).json({ error: `Credenciais inválidas: ${validation.error}` });
    }

    const supabase = getSupabaseServer();

    const { data: existing } = await supabase
      .from('whatsapp_cloud_credentials')
      .select('id')
      .eq('instance_id', instanceId)
      .single();

    const payload = {
      instance_id: instanceId,
      tenant_id: tenantId,
      phone_number_id: phoneNumberId,
      business_account_id: businessAccountId,
      app_id: appId,
      app_secret_encrypted: encrypt(appSecret),
      access_token_encrypted: encrypt(accessToken),
      api_version: apiVersion || 'v21.0',
      is_active: true,
    };

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('whatsapp_cloud_credentials')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('whatsapp_cloud_credentials')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    await supabase
      .from('whatsapp_instances')
      .update({ provider: 'cloudapi', phone: validation.phone?.replace(/\D/g, '') || null })
      .eq('id', instanceId);

    invalidateClientCache(instanceId);

    res.json({
      success: true,
      data: {
        id: result.id,
        phoneNumberId: result.phone_number_id,
        businessAccountId: result.business_account_id,
        appId: result.app_id,
        apiVersion: result.api_version,
        phone: validation.phone,
        verifiedName: validation.verifiedName,
        qualityRating: validation.qualityRating,
      },
    });
  } catch (error) {
    logger.error('Erro ao salvar credenciais Cloud API:', error);
    res.status(500).json({ error: error.message || 'Erro ao salvar credenciais' });
  }
});

router.get('/:instanceId', async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('whatsapp_cloud_credentials')
      .select('id, phone_number_id, business_account_id, app_id, api_version, webhook_verify_token, is_active, created_at')
      .eq('instance_id', req.params.instanceId)
      .eq('tenant_id', req.orgId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Credenciais não encontradas' });
    }

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Erro ao buscar credenciais:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:instanceId', async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('whatsapp_cloud_credentials')
      .delete()
      .eq('instance_id', req.params.instanceId)
      .eq('tenant_id', req.orgId);

    if (error) throw error;

    await supabase
      .from('whatsapp_instances')
      .update({ provider: 'whatsmeow' })
      .eq('id', req.params.instanceId);

    invalidateClientCache(req.params.instanceId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Erro ao deletar credenciais:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { phoneNumberId, accessToken } = req.body;
    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({ error: 'phoneNumberId e accessToken obrigatórios' });
    }
    const result = await validateCredentials({ phoneNumberId, accessToken });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
