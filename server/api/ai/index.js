import express from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import axios from 'axios';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// Helper to get organization AI keys
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
  return ['42p01', 'pgrst205'].includes(error?.code) ||
    message.includes('does not exist') ||
    message.includes('schema cache');
}

router.get('/agents', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingRelationError(error)) {
        const agents = await listFallbackAgents(supabase, req.orgId);
        return res.json({
          success: true,
          agents,
          setup_required: true,
          message: 'Tabela ai_agents ainda nao foi criada. Salvando agentes temporariamente em site_settings.integrations.operationalAgents.',
        });
      }
      throw error;
    }
    res.json({ success: true, agents: (data || []).map(hydrateAgent) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/agents', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const payload = normalizeAgentPayload(req.body);

    const { data, error } = await supabase
      .from('ai_agents')
      .insert({
        ...payload,
        organization_id: req.orgId,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        const agent = await createFallbackAgent(supabase, req.orgId, payload);
        return res.status(201).json({ success: true, agent, setup_required: true });
      }
      throw error;
    }
    res.status(201).json({ success: true, agent: hydrateAgent(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/agents/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const payload = normalizeAgentPayload(req.body, true);

    const { data, error } = await supabase
      .from('ai_agents')
      .update(payload)
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        const agent = await updateFallbackAgent(supabase, req.orgId, req.params.id, payload);
        if (!agent) return res.status(404).json({ error: 'Agente nao encontrado' });
        return res.json({ success: true, agent, setup_required: true });
      }
      throw error;
    }
    res.json({ success: true, agent: hydrateAgent(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/agents/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId);

    if (error) {
      if (isMissingRelationError(error)) {
        await deleteFallbackAgent(supabase, req.orgId, req.params.id);
        return res.json({ success: true, setup_required: true });
      }
      throw error;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
    if (extendedConfig[key] === undefined || (partial && extendedConfig[key] === null)) {
      delete extendedConfig[key];
    }
  });

  const payload = {
    name: body.name,
    role: body.role,
    channel: body.channel || 'whatsapp',
    is_active: body.status ? body.status === 'Ativo' || body.status === 'Em teste' : (body.is_active ?? true),
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
    if (payload[key] === undefined || (partial && payload[key] === null)) delete payload[key];
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
  return settings?.integrations?.operationalAgents || [];
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

router.post('/generate-page', verifyAuth, requireTenant, async (req, res) => {
  const { prompt, niche } = req.body;
  const organizationId = req.orgId;

  try {
    const config = await getOrgAIConfig(organizationId);
    
    // Determine provider and key
    // We prioritize "namoBana" as requested, falling back to openai or gemini
    const provider = config?.namoBana?.apiKey ? 'namobana' : (config?.openai?.apiKey ? 'openai' : 'gemini');
    const apiKey = config?.namoBana?.apiKey || config?.openai?.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'Nenhuma chave de IA configurada para esta organização.' });
    }

    // Call AI (Abstraction)
    const layout = await generateLayoutWithAI(provider, apiKey, prompt, niche);

    res.json({ layout });
  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat', verifyAuth, requireTenant, async (req, res) => {
  const { prompt, systemInstruction, temperature = 0.7, jsonMode = false } = req.body;
  const organizationId = req.orgId;
  
  // Try Gemini first (Global or Org-specific)
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('Gemini Key missing');

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          responseMimeType: jsonMode ? "application/json" : "text/plain"
        },
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({ text });
  } catch (geminiError) {
    console.warn('⚠️ Gemini failed, trying Groq fallback...', geminiError.message);
    
    // Fallback to Groq
    try {
      let groqKey = process.env.GROQ_API_KEY;
      
      // If organizationId is provided, try to get their specific Groq key
      if (organizationId) {
        const config = await getOrgAIConfig(organizationId);
        if (config?.groq?.apiKey) {
          groqKey = config.groq.apiKey;
        }
      }

      if (!groqKey) {
        return res.status(500).json({ error: 'Nenhuma chave de IA disponível (Gemini falhou e Groq não configurado).' });
      }

      const groqResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemInstruction || 'Você é um assistente útil.' },
            { role: 'user', content: prompt }
          ],
          temperature,
          response_format: jsonMode ? { type: 'json_object' } : undefined
        },
        {
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const text = groqResponse.data.choices?.[0]?.message?.content || '';
      return res.json({ text });
    } catch (groqError) {
      console.error('❌ Groq Fallback Error:', groqError.response?.data || groqError.message);
      return res.status(500).json({ error: 'Falha em todos os provedores de IA.' });
    }
  }
});

async function generateLayoutWithAI(provider, apiKey, prompt, niche) {
  // This is a mock implementation of the AI call. 
  // In a real scenario, we would use the provider's SDK or Axios.
  // For now, I'll return a structured JSON based on the niche.
  
  console.log(`Generating with ${provider} for niche ${niche}: ${prompt}`);

  // Simulate prompt processing
  return {
    themeConfig: {
      primaryColor: niche === 'rural' ? '#166534' : '#2563eb',
      secondaryColor: '#f59e0b',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter',
      fontSize: {
        base: '16px',
        heading1: '48px',
        heading2: '36px',
        heading3: '24px'
      },
      borderRadius: '8px',
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' }
    },
    blocks: [
      {
        id: 'hero-1',
        type: 'hero',
        order: 0,
        visible: true,
        config: {
          title: `Oportunidade Única em Imóvel ${niche === 'rural' ? 'Rural' : 'Urbano'}`,
          subtitle: prompt || 'Descrição gerada por IA baseada na sua necessidade.',
          backgroundImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000',
          overlayOpacity: 0.4,
          ctaText: 'Ver Detalhes',
          ctaLink: '#properties',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0px' }
      },
      {
        id: 'text-1',
        type: 'text',
        order: 1,
        visible: true,
        config: {
          content: '## Por que escolher este imóvel?\n\nInfraestrutura completa e localização estratégica para o seu investimento.',
          fontSize: 18,
          fontWeight: 400,
          color: '#374151',
          alignment: 'center'
        },
        styles: { padding: '60px 20px' }
      }
    ]
  };
}

export default router;
