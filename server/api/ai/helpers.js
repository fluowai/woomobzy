import { getSupabaseServer } from '../../lib/supabase-server.js';
import { randomUUID } from 'crypto';

async function getOrgAIConfig(orgId) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('site_settings')
    .select('integrations')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error || !data) return null;
  return data.integrations;
}

function isMissingRelationError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    ['42p01', 'pgrst205'].includes(error?.code) ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
}

function normalizeAgentPayload(body, partial = false) {
  const extendedConfig = {
    department: body.department,
    status: body.status || (body.is_active ? 'Ativo' : 'Rascunho'),
    description: body.description,
    avatar_url: body.avatar_url,
    icon: body.icon,
    operation_mode: body.operation_mode,
    autonomy_level: Number(body.autonomy_level || 1),
    channel_scope: body.channel_scope,
    channels: body.channels || [],
    instances: body.instances || [],
    channel_permissions: body.channel_permissions || {},
    workspaces: body.workspaces || [],
    triggers: body.triggers || [],
    permissions: body.permissions || {},
    pipelines: body.pipelines || [],
    knowledge_sources: body.knowledge_sources || [],
    handoff: body.handoff || {},
    metrics: body.metrics || [],
    simulation: body.simulation || {},
    limits: body.limits || {},
  };

  Object.keys(extendedConfig).forEach((key) => {
    if (
      extendedConfig[key] === undefined ||
      (partial && extendedConfig[key] === null)
    ) {
      delete extendedConfig[key];
    }
  });

  const payload = {
    name: body.name,
    role: body.role,
    channel: body.channel || 'whatsapp',
    is_active: body.status
      ? body.status === 'Ativo' || body.status === 'Em teste'
      : (body.is_active ?? true),
    personality: body.personality || '',
    instructions: body.instructions || body.operational_instructions || '',
    handoff_rules: {
      ...(body.handoff_rules || {}),
      __operational360: extendedConfig,
    },
    capabilities: body.capabilities || [],
    tools: body.tools || [],
    response_style: body.response_style || 'consultivo',
    working_hours: {
      ...(body.working_hours || {}),
      limits: body.limits || body.working_hours?.limits || {},
    },
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined || (partial && payload[key] === null))
      delete payload[key];
  });

  if (!partial && (!payload.name || !payload.role)) {
    throw new Error('Nome e funcao do agente sao obrigatorios.');
  }

  return payload;
}

function hydrateAgent(agent) {
  const config = agent?.handoff_rules?.__operational360 || {};
  const { __operational360, ...handoffRules } = agent?.handoff_rules || {};

  return {
    ...agent,
    ...config,
    handoff_rules: handoffRules,
    status: config.status || (agent?.is_active ? 'Ativo' : 'Pausado'),
    department: config.department || 'Atendimento',
    description: config.description || '',
    operation_mode: config.operation_mode || 'Copiloto humano',
    autonomy_level: config.autonomy_level || 2,
  };
}

async function getFallbackSettings(supabase, organizationId) {
  const { data, error } = await supabase
    .from('site_settings')
    .select('id, integrations')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function saveFallbackAgents(supabase, organizationId, agents) {
  const settings = await getFallbackSettings(supabase, organizationId);
  const integrations = {
    ...(settings?.integrations || {}),
    operationalAgents: agents,
  };

  if (settings?.id) {
    const { error } = await supabase
      .from('site_settings')
      .update({ integrations })
      .eq('id', settings.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('site_settings').insert({
    organization_id: organizationId,
    integrations,
  });
  if (error) throw error;
}

async function listFallbackAgents(supabase, organizationId) {
  const settings = await getFallbackSettings(supabase, organizationId);
  const integrations =
    typeof settings?.integrations === 'object' && settings?.integrations
      ? settings.integrations
      : {};
  return Array.isArray(integrations.operationalAgents)
    ? integrations.operationalAgents
    : [];
}

async function listFallbackAgentsSafe(supabase, organizationId) {
  try {
    return await listFallbackAgents(supabase, organizationId);
  } catch (error) {
    console.warn('[AIAgents] Fallback indisponivel:', error.message);
    return [];
  }
}

async function createFallbackAgent(supabase, organizationId, payload) {
  const agents = await listFallbackAgents(supabase, organizationId);
  const agent = hydrateAgent({
    ...payload,
    id: randomUUID(),
    organization_id: organizationId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await saveFallbackAgents(supabase, organizationId, [agent, ...agents]);
  return agent;
}

async function updateFallbackAgent(supabase, organizationId, agentId, payload) {
  const agents = await listFallbackAgents(supabase, organizationId);
  let updated = null;
  const nextAgents = agents.map((agent) => {
    if (agent.id !== agentId) return agent;
    updated = hydrateAgent({
      ...agent,
      ...payload,
      updated_at: new Date().toISOString(),
    });
    return updated;
  });
  if (!updated) return null;
  await saveFallbackAgents(supabase, organizationId, nextAgents);
  return updated;
}

async function deleteFallbackAgent(supabase, organizationId, agentId) {
  const agents = await listFallbackAgents(supabase, organizationId);
  await saveFallbackAgents(
    supabase,
    organizationId,
    agents.filter((agent) => agent.id !== agentId)
  );
}

export {
  getOrgAIConfig,
  isMissingRelationError,
  normalizeAgentPayload,
  hydrateAgent,
  getFallbackSettings,
  saveFallbackAgents,
  listFallbackAgents,
  listFallbackAgentsSafe,
  createFallbackAgent,
  updateFallbackAgent,
  deleteFallbackAgent,
};
