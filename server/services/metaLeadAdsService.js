/**
 * Meta Lead Ads integration service.
 *
 * Responsibilities:
 *  - Map Meta Lead Ads payload to IMOBZY lead fields
 *  - Resolve organization from form/campaign/page mapping
 *  - Resolve assigned agent from routing config
 *  - Deduplicate by meta_lead_id
 *  - Persist raw payload + audit event
 *  - Trigger property matching and lead distribution
 */

import { getSupabaseServer } from '../lib/supabase-server.js';

const META_SOURCE = 'Meta Lead Ads';

function pick(obj, keys, fallback) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return fallback;
}

function normalizePhone(value = '') {
  return String(value).replace(/\D/g, '').slice(-11);
}

function mapFieldValue(fieldNames, fieldValues, candidates, fallback) {
  const lowered = candidates.map((c) => c.toLowerCase());
  for (let i = 0; i < fieldNames.length; i++) {
    const name = String(fieldNames[i] || '').toLowerCase();
    if (lowered.includes(name) && fieldValues[i] !== undefined) {
      return fieldValues[i];
    }
  }
  return fallback;
}

export function mapMetaLeadToLeadPayload(payload) {
  const fieldNames = Array.isArray(payload.field_names)
    ? payload.field_names
    : [];
  const fieldValues = Array.isArray(payload.field_values)
    ? payload.field_values
    : [];

  const rawPhone = mapFieldValue(fieldNames, fieldValues, [
    'phone',
    'telefone',
    'celular',
    'phone_number',
    'mobile',
    'whatsapp',
  ]);
  const phone = normalizePhone(rawPhone);

  const name = mapFieldValue(fieldNames, fieldValues, [
    'name',
    'full_name',
    'nome',
    'nome_completo',
  ]) || '';

  const email = mapFieldValue(fieldNames, fieldValues, [
    'email',
    'e-mail',
    'email_address',
  ]) || null;

  const message = mapFieldValue(fieldNames, fieldValues, [
    'message',
    'mensagem',
    'observacao',
    'obs',
    'note',
  ]) || null;

  const budgetRaw = mapFieldValue(fieldNames, fieldValues, [
    'budget',
    'orcamento',
    'preco',
    'preço',
  ]) || null;
  const budget = budgetRaw ? Number(budgetRaw) : null;

  const interestRaw = mapFieldValue(fieldNames, fieldValues, [
    'interest',
    'interesse',
    'tipo_imovel',
    'property_type',
    'segmento',
  ]) || null;
  const aptitude_interest = interestRaw
    ? String(interestRaw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12)
    : null;

  return {
    name: name || 'Lead Meta Ads',
    phone,
    email,
    notes: message,
    budget: Number.isFinite(budget) ? budget : null,
    aptitude_interest,
    source: META_SOURCE,
    status: 'Novo',
    classification: null,
    lead_score: null,
    match_profile: null,
    property_id: null,
    assigned_to: null,
    meta_lead_id: String(payload.lead_id || payload.id || ''),
    meta_form_id: String(payload.form_id || ''),
    meta_campaign_id: String(payload.campaign_id || ''),
    meta_ad_id: String(payload.ad_id || ''),
    meta_ad_name: String(payload.ad_name || ''),
    meta_payload: payload,
    utm_source: payload.utm_source || pick(payload, ['utm_source']) || 'facebook',
    utm_medium: payload.utm_medium || pick(payload, ['utm_medium']) || 'paid_social',
    utm_campaign: payload.utm_campaign || String(payload.campaign_id || ''),
    utm_term: payload.utm_term || null,
    utm_content: payload.utm_content || null,
    referrer_url: payload.referrer_url || null,
    landing_page_url: payload.landing_page_url || null,
    fbp: payload.fbp || null,
    fbc: payload.fbc || null,
    client_id: payload.client_id || null,
    session_data: payload.session_data || {},
  };
}

export async function resolveMetaOrganization(payload) {
  const supabase = getSupabaseServer();

  const byForm = await supabase
    .from('meta_lead_ads_config')
    .select('organization_id')
    .eq('meta_form_id', String(payload.form_id || ''))
    .eq('active', true)
    .maybeSingle();

  if (!byForm.error && byForm.data?.organization_id) {
    return byForm.data.organization_id;
  }

  const byCampaign = await supabase
    .from('meta_lead_ads_config')
    .select('organization_id')
    .eq('meta_campaign_id', String(payload.campaign_id || ''))
    .eq('active', true)
    .maybeSingle();

  if (!byCampaign.error && byCampaign.data?.organization_id) {
    return byCampaign.data.organization_id;
  }

  const byAd = await supabase
    .from('meta_lead_ads_config')
    .select('organization_id')
    .eq('meta_ad_id', String(payload.ad_id || ''))
    .eq('active', true)
    .maybeSingle();

  if (!byAd.error && byAd.data?.organization_id) {
    return byAd.data.organization_id;
  }

  return null;
}

export async function resolveMetaAssignedAgent(payload) {
  const supabase = getSupabaseServer();

  const byForm = await supabase
    .from('meta_lead_ads_config')
    .select('assigned_agent_id')
    .eq('meta_form_id', String(payload.form_id || ''))
    .eq('active', true)
    .maybeSingle();

  if (!byForm.error && byForm.data?.assigned_agent_id) {
    return byForm.data.assigned_agent_id;
  }

  const byCampaign = await supabase
    .from('meta_lead_ads_config')
    .select('assigned_agent_id')
    .eq('meta_campaign_id', String(payload.campaign_id || ''))
    .eq('active', true)
    .maybeSingle();

  if (!byCampaign.error && byCampaign.data?.assigned_agent_id) {
    return byCampaign.data.assigned_agent_id;
  }

  const byAd = await supabase
    .from('meta_lead_ads_config')
    .select('assigned_agent_id')
    .eq('meta_ad_id', String(payload.ad_id || ''))
    .eq('active', true)
    .maybeSingle();

  if (!byAd.error && byAd.data?.assigned_agent_id) {
    return byAd.data.assigned_agent_id;
  }

  return null;
}

export async function insertMetaLead(payload) {
  const supabase = getSupabaseServer();
  const leadPayload = mapMetaLeadToLeadPayload(payload);
  const organizationId = await resolveMetaOrganization(payload);

  if (!organizationId) {
    return { error: new Error('Organização não mapeada para Meta Lead Ads'), leadPayload };
  }

  const metaLeadId = String(payload.lead_id || payload.id || '');
  if (metaLeadId) {
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('meta_lead_id', metaLeadId)
      .maybeSingle();

    if (existing?.id) {
      return { error: new Error('Lead duplicado'), leadPayload, duplicate: true };
    }
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...leadPayload,
      organization_id: organizationId,
    })
    .select('id, assigned_to')
    .single();

  if (error || !data) {
    return { error: error || new Error('Falha ao inserir lead'), leadPayload };
  }

  return { data, leadPayload };
}

export async function processMetaLeadWithRouting(payload) {
  const supabase = getSupabaseServer();
  const { data, leadPayload, error } = await insertMetaLead(payload);

  if (error) {
    await insertMetaWebhookEvent(payload, 'error', error.message);
    return { success: false, error: error.message, leadPayload };
  }

  const assignedAgentId = await resolveMetaAssignedAgent(payload);
  const updatePayload = {};

  if (assignedAgentId) {
    updatePayload.assigned_to = assignedAgentId;
  }

  if (Object.keys(updatePayload).length > 0) {
    await supabase.from('leads').update(updatePayload).eq('id', data.id);
  }

  let matchResult = null;
  try {
    const { matchLeadProperties } = await import('../services/leadPropertyMatcher.js');
    matchResult = await matchLeadProperties({
      supabase,
      lead: { ...leadPayload, id: data.id },
      organizationId: leadPayload.organization_id,
      createdBy: null,
    });
  } catch (matchError) {
    console.error('[MetaLeadAds] matchLeadProperties error:', matchError.message);
  }

  let distributionResult = null;
  if (!assignedAgentId) {
    try {
      const { bulkDistributeLeads } = await import('./leadDistributionService.js');
      distributionResult = await bulkDistributeLeads(
        leadPayload.organization_id,
        [data.id],
        'balanced'
      );
    } catch (distError) {
      console.error('[MetaLeadAds] distributeLead error:', distError.message);
    }
  }

  await insertMetaWebhookEvent(payload, 'processed', null, {
    lead_id: data.id,
    assigned_to: assignedAgentId || distributionResult?.[0]?.brokerId || null,
  });

  return {
    success: true,
    lead: { ...data, ...leadPayload },
    matchResult,
    distributionResult,
    assignedAgentId,
  };
}

async function insertMetaWebhookEvent(payload, status, errorMessage, extra = {}) {
  const supabase = getSupabaseServer();
  const organizationId = await resolveMetaOrganization(payload).catch(() => null);

  try {
    await supabase.from('meta_webhook_events').insert({
      organization_id: organizationId,
      meta_lead_id: String(payload.lead_id || payload.id || ''),
      event_type: 'lead',
      payload,
      status,
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
      ...extra,
    });
  } catch (auditError) {
    console.error('[MetaLeadAds] Failed to insert webhook event:', auditError.message);
  }
}
