import express from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import axios from 'axios';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { randomUUID } from 'crypto';
import { AICoreService } from '../../services/aiCoreService.js';

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
      console.warn('[AIAgents] Falha ao listar ai_agents, usando fallback:', error.message);
      const agents = await listFallbackAgentsSafe(supabase, req.orgId);
      return res.json({
        success: true,
        agents,
        setup_required: true,
        message: isMissingRelationError(error)
          ? 'Tabela ai_agents ainda nao foi criada. Salvando agentes temporariamente em site_settings.integrations.operationalAgents.'
          : 'Nao foi possivel consultar ai_agents. A tela foi carregada em modo seguro.',
      });
    }
    res.json({ success: true, agents: (data || []).map(hydrateAgent) });
  } catch (error) {
    console.error('[AIAgents] Erro ao carregar agentes:', error.message);
    res.json({
      success: true,
      agents: [],
      setup_required: true,
      message: 'Nao foi possivel carregar agentes agora. A tela foi carregada em modo seguro.',
    });
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
    flow_steps: body.flow_steps === undefined ? undefined : normalizeAgentFlowSteps(body.flow_steps),
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

function normalizeAgentFlowSteps(steps = []) {
  if (!Array.isArray(steps)) return [];

  return steps
    .map((step, index) => ({
      id: String(step?.id || `etapa-${index + 1}`),
      title: String(step?.title || `Etapa ${index + 1}`).slice(0, 80),
      trigger: String(step?.trigger || '').slice(0, 500),
      prompt: String(step?.prompt || '').slice(0, 1200),
      action: String(step?.action || '').slice(0, 500),
      enabled: step?.enabled !== false,
    }))
    .filter((step) => step.title && (step.trigger || step.prompt || step.action));
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
  const integrations = typeof settings?.integrations === 'object' && settings?.integrations
    ? settings.integrations
    : {};
  return Array.isArray(integrations.operationalAgents) ? integrations.operationalAgents : [];
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

  if (process.env.AI_CORE_DISABLED !== 'true') {
    try {
      const aiCore = new AICoreService();
      const result = await aiCore.chat({
        organizationId,
        userId: req.user?.id,
        routeKey: req.body.route_key || 'default',
        channel: req.body.channel || 'api',
        messages: req.body.messages || [],
        prompt,
        systemInstruction,
        modelId: req.body.model || req.body.model_id || '',
        temperature,
        maxTokens: req.body.max_tokens || req.body.maxTokens,
        jsonMode,
        metadata: { source: 'legacy-api-ai-chat' },
      });
      return res.json({ text: result.text, usage: result.usage, model: result.model, engine: result.engine });
    } catch (aiCoreError) {
      console.warn('[AI Core] Local chat failed, falling back to legacy providers:', aiCoreError.message);
    }
  }
  
  // Try Gemini first (Global or Org-specific)
  try {
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!geminiKey || geminiKey.includes('YOUR_') || geminiKey.length < 20) {
      throw new Error('Gemini API key inválida. Configure GEMINI_API_KEY no .env');
    }

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

// ==========================================
// CONVERSATION MEMORY ENDPOINTS
// ==========================================

function buildMemorySystemPrompt(agent, recentHistory) {
  const historyBlock = recentHistory?.length
    ? `\nHistorico recente da conversa:\n${recentHistory.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n')}\n`
    : '\n(Inicio da conversa - nenhum historico ainda)\n';

  return `Você é ${agent.name || 'um agente IMOBZY'}, ${agent.role || 'atendente imobiliario'}.

PERSONALIDADE: ${agent.personality || 'Consultiva, clara e objetiva'}

INSTRUCOES: ${agent.instructions || 'Atenda com foco em qualificar o lead'}

ESTILO: ${agent.response_style || 'consultivo'}

CAPACIDADES: ${(agent.capabilities || []).join(', ') || 'Atendimento, Qualificacao, CRM'}

FERRAMENTAS DISPONIVEIS: ${(agent.tools || []).join(', ') || 'WhatsApp, Kanban, CRM'}

NIVEL DE AUTONOMIA: ${agent.autonomy_level || 2} (1=Assistido, 2=Semiautonomo, 3=Autonomo)

REGRAS DE TRANSFERENCIA: ${Object.entries(agent.handoff_rules || {})
  .filter(([, v]) => v)
  .map(([k]) => k)
  .join(', ') || 'Nenhuma'}

${historyBlock}

REGRAS IMPORTANTES:
- NUNCA repita perguntas que ja foram respondidas no historico acima.
- Se ja tiver as informacoes do lead, avance na conversa.
- Mantenha o contexto e nao pergunte a mesma coisa duas vezes.
- Responda em portugues natural, como um corretor humano faria.`;
}

router.post('/agents/:id/chat', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;
    const { message, session_id } = req.body;

    if (!message || !session_id) {
      return res.status(400).json({ error: 'Mensagem e session_id sao obrigatorios.' });
    }

    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agente nao encontrado.' });
    }

    const { error: memError } = await supabase.from('conversation_memory').insert({
      organization_id: req.orgId,
      agent_id: id,
      session_id,
      role: 'user',
      content: message,
    });
    if (memError) console.warn('[Memory] Erro ao salvar mensagem do usuario:', memError.message);

    const { data: recentHistory } = await supabase
      .from('conversation_memory')
      .select('role, content')
      .eq('organization_id', req.orgId)
      .eq('session_id', session_id)
      .order('created_at', { ascending: true })
      .limit(30);

    const systemInstruction = buildMemorySystemPrompt(agent, recentHistory);

    const config = await getOrgAIConfig(req.orgId);
    const provider = config?.namoBana?.apiKey ? 'namobana' : (config?.openai?.apiKey ? 'openai' : 'gemini');
    const apiKey = config?.namoBana?.apiKey || config?.openai?.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'Nenhuma chave de IA configurada.' });
    }

    let reply = '';

    if (process.env.AI_CORE_DISABLED !== 'true') {
      try {
        const aiCore = new AICoreService();
        const result = await aiCore.chat({
          organizationId: req.orgId,
          userId: req.user?.id,
          agentId: id,
          routeKey: 'agent_chat',
          channel: 'agent-test',
          messages: [
            ...(recentHistory || []).map((m) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
            { role: 'user', content: message },
          ],
          systemInstruction,
          temperature: 0.7,
          metadata: { source: 'legacy-agent-chat', session_id },
        });
        reply = result.text;
      } catch (aiCoreError) {
        console.warn('[AgentChat] AI Core local failed, trying legacy providers:', aiCoreError.message);
      }
    }

    try {
      if (reply) throw new Error('__AI_CORE_ALREADY_REPLIED__');
      if (provider === 'gemini' || !provider) {
        const geminiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            contents: [{ parts: [{ text: message }] }],
            generationConfig: { temperature: 0.7 },
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          }
        );
        reply = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else if (provider === 'openai') {
        const openaiResponse = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemInstruction },
              ...(recentHistory || []).map((m) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
              })),
              { role: 'user', content: message },
            ],
            temperature: 0.7,
          },
          { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
        );
        reply = openaiResponse.data.choices?.[0]?.message?.content || '';
      }
    } catch (aiError) {
      if (aiError.message === '__AI_CORE_ALREADY_REPLIED__') {
        // AI Core already produced the reply. Keep the legacy persistence flow below.
      } else {
      console.warn('[AgentChat] Primary AI failed, trying Groq:', aiError.message);
      let groqKey = config?.groq?.apiKey || process.env.GROQ_API_KEY;
      if (groqKey) {
        const groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemInstruction },
              ...(recentHistory || []).map((m) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
              })),
              { role: 'user', content: message },
            ],
            temperature: 0.7,
          },
          { headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' } }
        );
        reply = groqResponse.data.choices?.[0]?.message?.content || '';
      }
      }
    }

    if (!reply) {
      reply = 'Desculpe, nao consegui processar sua mensagem agora. Pode repetir?';
    }

    const { error: memError2 } = await supabase.from('conversation_memory').insert({
      organization_id: req.orgId,
      agent_id: id,
      session_id,
      role: 'assistant',
      content: reply,
    });
    if (memError2) console.warn('[Memory] Erro ao salvar resposta:', memError2.message);

    res.json({ success: true, reply, agent: { name: agent.name, role: agent.role } });
  } catch (error) {
    console.error('[AgentChat] Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/agents/:id/memory', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;
    const { session_id, limit = 50 } = req.query;

    let query = supabase
      .from('conversation_memory')
      .select('*')
      .eq('organization_id', req.orgId)
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limit) || 50, 200));

    if (session_id) {
      query = query.eq('session_id', session_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, messages: (data || []).reverse() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/agents/:id/memory', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;
    const { session_id } = req.body;

    let query = supabase
      .from('conversation_memory')
      .delete()
      .eq('organization_id', req.orgId)
      .eq('agent_id', id);

    if (session_id) {
      query = query.eq('session_id', session_id);
    }

    const { error } = await query;
    if (error) throw error;

    res.json({ success: true, message: session_id ? 'Sessao limpa.' : 'Memoria do agente limpa.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// NEURAL BRAIN - QUALIFICATION ENDPOINTS
// ==========================================

router.post('/agents/:id/qualify', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;
    const { lead_id, session_id, rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating deve ser entre 1 e 5.' });
    }

    const { data, error } = await supabase.from('agent_qualifications').insert({
      organization_id: req.orgId,
      agent_id: id,
      lead_id: lead_id || null,
      session_id: session_id || null,
      rating,
      feedback: feedback || '',
    }).select().single();

    if (error) throw error;

    res.status(201).json({ success: true, qualification: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/agents/:id/metrics', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;

    const [qualifications, memoryCount] = await Promise.all([
      supabase
        .from('agent_qualifications')
        .select('rating, created_at')
        .eq('organization_id', req.orgId)
        .eq('agent_id', id),
      supabase
        .from('conversation_memory')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', req.orgId)
        .eq('agent_id', id),
    ]);

    const ratings = qualifications.data || [];
    const avgRating = ratings.length
      ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length).toFixed(2)
      : 0;

    res.json({
      success: true,
      metrics: {
        total_conversations: memoryCount.count || 0,
        total_qualifications: ratings.length,
        average_rating: Number(avgRating),
        rating_distribution: {
          1: ratings.filter((r) => r.rating === 1).length,
          2: ratings.filter((r) => r.rating === 2).length,
          3: ratings.filter((r) => r.rating === 3).length,
          4: ratings.filter((r) => r.rating === 4).length,
          5: ratings.filter((r) => r.rating === 5).length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/agents/:id/learn', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;
    const { input_text, output_text, was_helpful, corrected_output, tags } = req.body;

    const { data, error } = await supabase.from('agent_learning').insert({
      organization_id: req.orgId,
      agent_id: id,
      input_text: input_text || '',
      output_text: output_text || '',
      was_helpful: was_helpful ?? null,
      corrected_output: corrected_output || null,
      tags: tags || [],
      learning_score: was_helpful === true ? 1 : was_helpful === false ? -1 : 0,
    }).select().single();

    if (error) throw error;

    res.status(201).json({ success: true, learning: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ORCHESTRATOR ENDPOINTS
// ==========================================

import { AgentOrchestrator, ToolRegistry, AgentStateMachine } from '../../lib/agents/index.js';

router.get('/tools', verifyAuth, requireTenant, async (req, res) => {
  res.json({ success: true, tools: ToolRegistry.listTools() });
});

router.post('/orchestrate', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { message, phone, session_id, instance_id } = req.body;
    if (!message || !phone) {
      return res.status(400).json({ error: 'message e phone são obrigatórios.' });
    }

    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.processMessage({
      organizationId: req.orgId,
      message,
      phone,
      sessionId: session_id || `orchestrated-${Date.now()}`,
      instanceId: instance_id,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Orchestrator] Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/agents/:id/state-machine', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('ai_agents')
      .select('id, name, flow_steps, state_machine')
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ error: 'Agente não encontrado.' });
    }

    const machine = AgentStateMachine.fromAgent(data);
    res.json({
      success: true,
      stateMachine: machine.toJSON(),
      currentStep: machine.getCurrentStep(),
      nextStep: machine.getNextStep(),
      remainingSteps: machine.getRemainingSteps().map((s) => s.title),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/agents/:id/permissions', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('ai_agents')
      .select('id, name, autonomy_policy, tool_permissions')
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ error: 'Agente não encontrado.' });
    }

    const policy = AutonomyPolicy.fromAgent(data);
    res.json({
      success: true,
      autonomyLevel: policy.getLevel(),
      autonomyLabel: policy.getLabel(),
      toolPermissions: policy.toolPermissions,
      permissions: policy.policy,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
