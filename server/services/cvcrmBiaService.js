import fetch from 'node-fetch';
import logger from '../utils/logger.js';
import { getSupabaseServer } from '../lib/supabase-server.js';

const DEFAULT_BIA_API_BASE_URL = 'https://xltw-api6-8lww.b2.xano.io';
const DEFAULT_CVCRM_API_BASE_URL = 'https://api.cvcrm.com.br';

/**
 * Busca as configurações de integração (chaves da API) do banco de dados para o Tenant específico.
 */
async function getTenantIntegrationConfigs(tenantId) {
  if (!tenantId) throw new Error('Tenant ID is required to fetch credentials');
  
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('site_settings')
    .select('integrations')
    .eq('organization_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch settings for tenant ${tenantId}: ${error.message}`);
  }

  const cvcrmKey = data?.integrations?.cvcrm?.apiKey;
  const biaKey = data?.integrations?.bia?.apiKey;
  const biaBaseUrl = data?.integrations?.bia?.baseUrl || DEFAULT_BIA_API_BASE_URL;

  return { cvcrmKey, biaKey, biaBaseUrl };
}

/**
 * Normaliza os dados do lead oriundos do webhook do CVcrm
 * para o formato esperado pela API da BIA.
 */
function mapCvcrmLeadToBia(cvcrmLead) {
  return {
    name: cvcrmLead.nome || cvcrmLead.name,
    phone: cvcrmLead.telefone || cvcrmLead.phone,
    email: cvcrmLead.email,
    externalId: cvcrmLead.id_lead || cvcrmLead.id,
    source: 'cvcrm',
    metadata: {
      empreendimento: cvcrmLead.empreendimento,
      origem: cvcrmLead.origem,
    }
  };
}

/**
 * Envia um lead novo para a BIA para iniciar o atendimento.
 */
export async function sendLeadToBia(cvcrmLead, biaKey, biaBaseUrl) {
  if (!biaKey) {
    logger.warn('[BIA Integration] BIA API Key is missing. Aborting sendLeadToBia.');
    return null;
  }

  try {
    const payload = mapCvcrmLeadToBia(cvcrmLead);
    
    const response = await fetch(`${biaBaseUrl}/api:5ONttZdQ/contatos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${biaKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[BIA Integration] Error sending lead to BIA. Status: ${response.status} - ${errorText}`);
      throw new Error(`BIA API error: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`[BIA Integration] Lead sent successfully. BIA response ID: ${data.id}`);
    return data;
  } catch (error) {
    logger.error(`[BIA Integration] Failed to send lead to BIA: ${error.message}`);
    throw error;
  }
}

/**
 * Registra o resumo do atendimento na timeline do lead no CVcrm.
 */
export async function registerInteractionOnCvcrm(cvcrmLeadId, summaryText, cvcrmKey) {
  if (!cvcrmKey) {
    logger.warn('[CVCrm Integration] CVcrm API Token is missing. Aborting registerInteractionOnCvcrm.');
    return null;
  }

  try {
    const endpoint = `${DEFAULT_CVCRM_API_BASE_URL}/api/v1/interacoes`; 
    
    const payload = {
      id_lead: cvcrmLeadId,
      descricao: summaryText,
      tipo: 'Atendimento BIA (IA)', 
      data_hora: new Date().toISOString()
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': cvcrmKey, // Ajuste para Bearer caso seja v3 (ex: 'Authorization': `Bearer ${cvcrmKey}`)
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[CVCrm Integration] Error registering interaction. Status: ${response.status} - ${errorText}`);
      throw new Error(`CVcrm API error: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`[CVCrm Integration] Interaction registered for lead ${cvcrmLeadId}`);
    return data;
  } catch (error) {
    logger.error(`[CVCrm Integration] Failed to register interaction on CVcrm: ${error.message}`);
    throw error;
  }
}

/**
 * Lida com o webhook recebido do CVcrm (Novo Lead)
 */
export async function handleCvcrmWebhook(tenantId, payload) {
  logger.info(`[CVCrm Webhook] Received new lead payload for tenant ${tenantId}`);
  
  const { biaKey, biaBaseUrl } = await getTenantIntegrationConfigs(tenantId);
  
  // Dispara assincronamente
  return sendLeadToBia(payload, biaKey, biaBaseUrl);
}

/**
 * Lida com o webhook recebido da BIA (Resumo de Atendimento Concluído)
 */
export async function handleBiaWebhook(tenantId, payload) {
  logger.info(`[BIA Webhook] Received chat summary for tenant ${tenantId}`);
  
  const { cvcrmKey } = await getTenantIntegrationConfigs(tenantId);

  const cvcrmLeadId = payload.externalId || payload.metadata?.cvcrmLeadId; 
  const summaryText = payload.summary || payload.message;

  if (!cvcrmLeadId) {
    throw new Error('Missing CVcrm Lead ID in BIA payload');
  }

  return registerInteractionOnCvcrm(cvcrmLeadId, summaryText, cvcrmKey);
}
