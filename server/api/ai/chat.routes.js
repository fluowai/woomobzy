import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import axios from 'axios';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getOrgAIConfig } from './helpers.js';

const router = Router();

async function generateLayoutWithAI(provider, apiKey, prompt, niche) {
  console.log(`Generating with ${provider} for niche ${niche}: ${prompt}`);

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
        heading3: '24px',
      },
      borderRadius: '8px',
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
    },
    blocks: [
      {
        id: 'hero-1',
        type: 'hero',
        order: 0,
        visible: true,
        config: {
          title: `Oportunidade Unica em Imovel ${niche === 'rural' ? 'Rural' : 'Urbano'}`,
          subtitle:
            prompt || 'Descricao gerada por IA baseada na sua necessidade.',
          backgroundImage:
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000',
          overlayOpacity: 0.4,
          ctaText: 'Ver Detalhes',
          ctaLink: '#properties',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff',
        },
        styles: { padding: '0px' },
      },
      {
        id: 'text-1',
        type: 'text',
        order: 1,
        visible: true,
        config: {
          content:
            '## Por que escolher este imovel?\n\nInfraestrutura completa e localizacao estrategica para o seu investimento.',
          fontSize: 18,
          fontWeight: 400,
          color: '#374151',
          alignment: 'center',
        },
        styles: { padding: '60px 20px' },
      },
    ],
  };
}

function buildMemorySystemPrompt(agent, recentHistory) {
  const historyBlock = recentHistory?.length
    ? `\nHistorico recente da conversa:\n${recentHistory.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n')}\n`
    : '\n(Inicio da conversa - nenhum historico ainda)\n';

  return `Voce e ${agent.name || 'um agente WooTech Imob'}, ${agent.role || 'atendente imobiliario'}.

PERSONALIDADE: ${agent.personality || 'Consultiva, clara e objetiva'}

INSTRUCOES: ${agent.instructions || 'Atenda com foco em qualificar o lead'}

ESTILO: ${agent.response_style || 'consultivo'}

CAPACIDADES: ${(agent.capabilities || []).join(', ') || 'Atendimento, Qualificacao, CRM'}

FERRAMENTAS DISPONIVEIS: ${(agent.tools || []).join(', ') || 'WhatsApp, Kanban, CRM'}

NIVEL DE AUTONOMIA: ${agent.autonomy_level || 2} (1=Assistido, 2=Semiautonomo, 3=Autonomo)

REGRAS DE TRANSFERENCIA: ${
    Object.entries(agent.handoff_rules || {})
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ') || 'Nenhuma'
  }

${historyBlock}

REGRAS IMPORTANTES:
- NUNCA repita perguntas que ja foram respondidas no historico acima.
- Se ja tiver as informacoes do lead, avance na conversa.
- Mantenha o contexto e nao pergunte a mesma coisa duas vezes.
- Responda em portugues natural, como um corretor humano faria.`;
}

router.post('/generate-page', verifyAuth, requireTenant, async (req, res) => {
  const { prompt, niche } = req.body;
  const organizationId = req.orgId;

  try {
    const config = await getOrgAIConfig(organizationId);

    const provider = config?.namoBana?.apiKey
      ? 'namobana'
      : config?.openai?.apiKey
        ? 'openai'
        : 'gemini';
    const apiKey =
      config?.namoBana?.apiKey ||
      config?.openai?.apiKey ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Nenhuma chave de IA configurada para esta organizacao.',
      });
    }

    const layout = await generateLayoutWithAI(provider, apiKey, prompt, niche);

    res.json({ layout });
  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const OPENAI_COMPATIBLE_ENDPOINTS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openai/gpt-4o-mini',
  },
  namoBana: {
    url: 'https://api.namobana.com/v1/chat/completions',
    model: 'gpt-4o-mini',
  },
};

function isValidKey(key) {
  return !!(
    key &&
    typeof key === 'string' &&
    key.trim() &&
    !key.includes('YOUR_') &&
    !key.includes('PLACEHOLDER') &&
    key.trim().length >= 20
  );
}

function collectChatProviders(config) {
  const extract = (keyConfig) => {
    if (!keyConfig) return '';
    const key = typeof keyConfig === 'object' ? keyConfig.apiKey : keyConfig;
    return typeof key === 'string' ? key.trim() : '';
  };

  const providers = [];

  const push = (name, key, endpoint, model) => {
    if (!isValidKey(key)) return;
    providers.push({ name, key, endpoint, model });
  };

  // Priority: per-org config (front/site_settings) > env vars
  push('openai', extract(config?.openai?.apiKey) || process.env.OPENAI_API_KEY, OPENAI_COMPATIBLE_ENDPOINTS.openai.url, config?.openai?.model || OPENAI_COMPATIBLE_ENDPOINTS.openai.model);
  push('namoBana', extract(config?.namoBana?.apiKey), OPENAI_COMPATIBLE_ENDPOINTS.namoBana.url, config?.namoBana?.model || OPENAI_COMPATIBLE_ENDPOINTS.namoBana.model);
  push('openrouter', extract(config?.openrouter?.apiKey) || process.env.OPENROUTER_API_KEY, OPENAI_COMPATIBLE_ENDPOINTS.openrouter.url, config?.openrouter?.model || OPENAI_COMPATIBLE_ENDPOINTS.openrouter.model);
  push('anthropic', extract(config?.anthropic?.apiKey) || process.env.ANTHROPIC_API_KEY, null, config?.anthropic?.model || 'claude-3-5-haiku-20241022');
  push('gemini', extract(config?.gemini?.apiKey) || process.env.GEMINI_API_KEY, null, config?.gemini?.model || 'gemini-2.0-flash');
  push('groq', extract(config?.groq?.apiKey) || process.env.GROQ_API_KEY, 'https://api.groq.com/openai/v1/chat/completions', config?.groq?.model || 'llama-3.3-70b-versatile');

  return providers;
}

// Returns { text } or throws with provider details
async function callChatProvider(provider, { prompt, systemInstruction, temperature, jsonMode }) {
  const messages = [
    {
      role: 'system',
      content: systemInstruction || 'Voce e um util assistente.',
    },
    { role: 'user', content: prompt },
  ];

  if (provider.name === 'gemini') {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.key}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          responseMimeType: jsonMode ? 'application/json' : 'text/plain',
        },
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction }] }
          : undefined,
      }
    );
    return {
      text: response.data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    };
  }

  if (provider.name === 'anthropic') {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: provider.model,
        max_tokens: provider.maxTokens || 4096,
        temperature,
        system: systemInstruction || 'Voce e um util assistente.',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': provider.key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );
    return { text: response.data.content?.[0]?.text || '' };
  }

  // OpenAI-compatible providers (openai, openrouter, groq, namoBana)
  const body = {
    model: provider.model,
    messages,
    temperature,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const url = provider.url || 'https://api.groq.com/openai/v1/chat/completions';

  const response = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${provider.key}`,
      'Content-Type': 'application/json',
    },
  });
  return { text: response.data.choices?.[0]?.message?.content || '' };
}

router.post('/chat', verifyAuth, requireTenant, async (req, res) => {
  const {
    prompt,
    systemInstruction,
    temperature = 0.7,
    jsonMode = false,
  } = req.body;
  const organizationId = req.orgId;

  try {
    const config = organizationId
      ? await getOrgAIConfig(organizationId)
      : null;

    const providers = collectChatProviders(config || {});

    if (providers.length === 0) {
      return res.status(400).json({
        error:
          'Nenhuma chave de IA configurada. Cadastre a(s) chave(s) nas configuracoes da empresa (Integracoes > IA) ou no .env do servidor.',
      });
    }

    const errors = [];
    for (const provider of providers) {
      try {
        const result = await callChatProvider(provider, {
          prompt,
          systemInstruction,
          temperature,
          jsonMode,
        });
        if (result.text) {
          return res.json(result);
        }
      } catch (error) {
        const detail =
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          error?.message ||
          'erro desconhecido';
        errors.push({ provider: provider.name, error: detail });
        console.warn(`[AIChat] ${provider.name} falhou, tentando proximo:`, detail);
      }
    }

    return res.status(503).json({
      error:
        'Falha em todos os provedores de IA. Verifique as chaves de API cadastradas nas configuracoes da empresa.',
      details: { providers: errors },
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/agents/:id/chat', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;
    const { message, session_id } = req.body;

    if (!message || !session_id) {
      return res
        .status(400)
        .json({ error: 'Mensagem e session_id sao obrigatorios.' });
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

    const { error: memError } = await supabase
      .from('conversation_memory')
      .insert({
        organization_id: req.orgId,
        agent_id: id,
        session_id,
        role: 'user',
        content: message,
      });
    if (memError)
      console.warn(
        '[Memory] Erro ao salvar mensagem do usuario:',
        memError.message
      );

    const { data: recentHistory } = await supabase
      .from('conversation_memory')
      .select('role, content')
      .eq('organization_id', req.orgId)
      .eq('session_id', session_id)
      .order('created_at', { ascending: true })
      .limit(30);

    const systemInstruction = buildMemorySystemPrompt(agent, recentHistory);

    const config = await getOrgAIConfig(req.orgId);
    const provider = config?.namoBana?.apiKey
      ? 'namobana'
      : config?.openai?.apiKey
        ? 'openai'
        : 'gemini';
    const apiKey =
      config?.namoBana?.apiKey ||
      config?.openai?.apiKey ||
      config?.gemini?.apiKey ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res
        .status(400)
        .json({ error: 'Nenhuma chave de IA configurada.' });
    }

    let reply = '';

    try {
      if (provider === 'gemini' || !provider) {
        const geminiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            contents: [{ parts: [{ text: message }] }],
            generationConfig: { temperature: 0.7 },
            systemInstruction: systemInstruction
              ? { parts: [{ text: systemInstruction }] }
              : undefined,
          }
        );
        reply =
          geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        reply = openaiResponse.data.choices?.[0]?.message?.content || '';
      }
    } catch (aiError) {
      console.warn(
        '[AgentChat] Primary AI failed, trying Groq:',
        aiError.message
      );
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
          {
            headers: {
              Authorization: `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        reply = groqResponse.data.choices?.[0]?.message?.content || '';
      }
    }

    if (!reply) {
      reply =
        'Desculpe, nao consegui processar sua mensagem agora. Pode repetir?';
    }

    const { error: memError2 } = await supabase
      .from('conversation_memory')
      .insert({
        organization_id: req.orgId,
        agent_id: id,
        session_id,
        role: 'assistant',
        content: reply,
      });
    if (memError2)
      console.warn('[Memory] Erro ao salvar resposta:', memError2.message);

    res.json({
      success: true,
      reply,
      agent: { name: agent.name, role: agent.role },
    });
  } catch (error) {
    console.error('[AgentChat] Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get(
  '/agents/:id/memory',
  verifyAuth,
  requireTenant,
  async (req, res) => {
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
  }
);

router.delete(
  '/agents/:id/memory',
  verifyAuth,
  requireTenant,
  async (req, res) => {
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

      res.json({
        success: true,
        message: session_id ? 'Sessao limpa.' : 'Memoria do agente limpa.',
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
