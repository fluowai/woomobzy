import { WhatsAppClient } from '@kapso/whatsapp-cloud-api';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { decrypt } from '../../lib/crypto.js';
import logger from '../../utils/logger.js';

const clientCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;
const cacheTimestamps = new Map();

function isCacheValid(key) {
  const ts = cacheTimestamps.get(key);
  return ts && Date.now() - ts < CACHE_TTL;
}

export function invalidateClientCache(instanceId) {
  clientCache.delete(instanceId);
  cacheTimestamps.delete(instanceId);
}

export async function getWhatsAppCloudClient(instanceId) {
  if (clientCache.has(instanceId) && isCacheValid(instanceId)) {
    return clientCache.get(instanceId);
  }

  const supabase = getSupabaseServer();
  const { data: cred, error } = await supabase
    .from('whatsapp_cloud_credentials')
    .select('*')
    .eq('instance_id', instanceId)
    .eq('is_active', true)
    .single();

  if (error || !cred) {
    throw new Error(`Credenciais Cloud API não encontradas para instância ${instanceId}`);
  }

  const accessToken = decrypt(cred.access_token_encrypted);

  const client = new WhatsAppClient({
    accessToken,
    phoneNumberId: cred.phone_number_id,
    graphApiVersion: cred.api_version || 'v21.0',
  });

  clientCache.set(instanceId, client);
  cacheTimestamps.set(instanceId, Date.now());

  return { client, credentials: cred };
}

export async function getWhatsAppCloudClientByPhoneNumberId(phoneNumberId) {
  const supabase = getSupabaseServer();
  const { data: cred, error } = await supabase
    .from('whatsapp_cloud_credentials')
    .select('instance_id')
    .eq('phone_number_id', phoneNumberId)
    .eq('is_active', true)
    .single();

  if (error || !cred) {
    return null;
  }

  return getWhatsAppCloudClient(cred.instance_id);
}

export async function validateCredentials({ phoneNumberId, accessToken, appId, appSecret }) {
  try {
    const testUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}`;
    const response = await fetch(testUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const body = await response.json();
      return {
        valid: false,
        error: body?.error?.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      valid: true,
      phone: data.display_phone_number,
      verifiedName: data.verified_name,
      qualityRating: data.quality_rating,
      statusCode: data.account_mode,
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
