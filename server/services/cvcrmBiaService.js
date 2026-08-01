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
    throw new Error(
      `Failed to fetch settings for tenant ${tenantId}: ${error.message}`
    );
  }

  const cvcrmKey = data?.integrations?.cvcrm?.apiKey;
  const cvcrmEmail = data?.integrations?.cvcrm?.email;
  const cvcrmBaseUrl =
    data?.integrations?.cvcrm?.baseUrl || DEFAULT_CVCRM_API_BASE_URL;
  const biaKey = data?.integrations?.bia?.apiKey;
  const biaBaseUrl =
    data?.integrations?.bia?.baseUrl || DEFAULT_BIA_API_BASE_URL;

  return { cvcrmKey, cvcrmEmail, cvcrmBaseUrl, biaKey, biaBaseUrl };
}

/**
 * Normaliza os dados do lead oriundos do webhook do CVcrm
 * para o formato esperado pela API da BIA.
 */
function mapCvcrmLeadToBia(cvcrmLead) {
  return {
    name: cvcrmLead.nome || cvcrmLead.name,
    phoneNumber: cvcrmLead.telefone || cvcrmLead.phone,
    email: cvcrmLead.email,
    externalId: cvcrmLead.id_lead || cvcrmLead.id,
    source: 'cvcrm',
    metadata: {
      empreendimento: cvcrmLead.empreendimento,
      origem: cvcrmLead.origem,
    },
  };
}

/**
 * Envia um lead novo para a BIA para iniciar o atendimento.
 */
export async function sendLeadToBia(cvcrmLead, biaKey, biaBaseUrl) {
  if (!biaKey) {
    logger.warn(
      '[BIA Integration] BIA API Key is missing. Aborting sendLeadToBia.'
    );
    return null;
  }

  try {
    const payload = mapCvcrmLeadToBia(cvcrmLead);

    const response = await fetch(`${biaBaseUrl}/api:5ONttZdQ/contatos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${biaKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        `[BIA Integration] Error sending lead to BIA. Status: ${response.status} - ${errorText}`
      );
      throw new Error(`BIA API error: ${response.status}`);
    }

    const data = await response.json();
    logger.info(
      `[BIA Integration] Lead sent successfully. BIA response ID: ${data.id}`
    );
    return data;
  } catch (error) {
    logger.error(
      `[BIA Integration] Failed to send lead to BIA: ${error.message}`
    );
    throw error;
  }
}

/**
 * Sincroniza o Lead e adiciona a Interação no CVcrm (CVIO).
 * Cria o lead se não existir, ou edita adicionando a interação se já existir.
 */
export async function syncLeadAndInteractionCvcrm(biaPayload, summaryText, cvcrmKey, cvcrmEmail, cvcrmBaseUrl) {
  if (!cvcrmKey || !cvcrmEmail) {
    logger.warn('[CVCrm Integration] CVcrm API Token or Email is missing. Aborting sync.');
    return null;
  }

  try {
    const endpoint = `${cvcrmBaseUrl.replace(/\/$/, '')}/api/cvio/lead`; 
    
    const payload = {
      nome: biaPayload.name || 'Lead via WhatsApp (BIA)',
      telefone: biaPayload.phoneNumber || biaPayload.phone || '',
      email: biaPayload.email || '',
      origem: 'WhatsApp BIA',
      empreendimento: biaPayload.metadata?.empreendimento || 'Bosque dos Pássaros',
      permitir_alteracao: 'true', // CVIO exige string ou boolean 'true' para alterar
      interacoes: [
        {
          tipo: 'A', // Anotação
          descricao: summaryText
        }
      ]
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'email': cvcrmEmail,
        'token': cvcrmKey, 
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[CVCrm Integration] Error syncing lead. Status: ${response.status} - ${errorText}`);
      throw new Error(`CVcrm API error (Sync Lead): ${response.status}`);
    }

    const textData = await response.text();
    const data = textData ? JSON.parse(textData) : {};
    
    // CVIO retorna { id: X } ou { idlead: X }
    const leadId = data.id || data.idlead || data.id_lead || 'lead_simulado_' + Date.now();
    logger.info(`[CVCrm Integration] Lead synced on CVcrm. ID: ${leadId}`);
    return leadId;
  } catch (error) {
    logger.error(`[CVCrm Integration] Failed to sync lead on CVcrm: ${error.message}`);
    throw error;
  }
}

/**
 * Lida com o webhook recebido do CVcrm (Novo Lead)
 */
export async function handleCvcrmWebhook(tenantId, payload) {
  logger.info(
    `[CVCrm Webhook] Received new lead payload for tenant ${tenantId}`
  );

  const { biaKey, biaBaseUrl } = await getTenantIntegrationConfigs(tenantId);

  // Dispara assincronamente
  return sendLeadToBia(payload, biaKey, biaBaseUrl);
}

/**
 * Lida com o webhook recebido da BIA (Resumo de Atendimento Concluído)
 */
export async function handleBiaWebhook(tenantId, payload) {
  logger.info(`[BIA Webhook] Received chat summary for tenant ${tenantId}`);
  
  const { cvcrmKey, cvcrmEmail, cvcrmBaseUrl } = await getTenantIntegrationConfigs(tenantId);

  const summaryText = payload.summary || payload.message;

  // A nova lógica do CVIO permite enviar tudo em uma única requisição.
  // Se o lead já existe (por email ou telefone), ele adiciona a interação.
  // Se não existe, ele cria e já adiciona a interação.
  return syncLeadAndInteractionCvcrm(payload, summaryText, cvcrmKey, cvcrmEmail, cvcrmBaseUrl);
}
