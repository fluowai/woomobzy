import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import axios from 'axios';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getOrgAIConfig, hydrateAgent } from './helpers.js';
import { AgentOrchestrator } from '../../services/ai/agentOrchestrator.js';
import { buildAgentSystemPrompt } from '../../services/ai/agentPrompt.js';
import { ConversationSimulator } from '../../services/ai/conversationSimulator.js';

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
  return buildAgentSystemPrompt(agent, {
    history: recentHistory,
    channel: 'WhatsApp',
  });
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

router.post('/chat', verifyAuth, requireTenant, async (req, res) => {
  const {
    prompt,
    systemInstruction,
    temperature = 0.7,
    jsonMode = false,
  } = req.body;
  const organizationId = req.orgId;

  try {
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const hasGemini =
      geminiKey && !geminiKey.includes('YOUR_') && geminiKey.length >= 20;

    if (!hasGemini) {
      throw new Error(
        'Gemini API key invalida ou nao configurada. Configure GEMINI_API_KEY no .env do servidor.'
      );
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
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

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({ text });
  } catch (geminiError) {
    console.warn('Gemini failed, trying Groq fallback...', geminiError.message);

    try {
      let groqKey = process.env.GROQ_API_KEY;

      if (organizationId) {
        const config = await getOrgAIConfig(organizationId);
        if (config?.groq?.apiKey) {
          groqKey = config.groq.apiKey;
        }
      }

      if (!groqKey) {
        return res.status(503).json({
          error:
            'Nenhum provedor de IA disponivel. Configure GEMINI_API_KEY ou GROQ_API_KEY no .env do servidor.',
          details: {
            gemini: hasGemini ? 'configured but failed' : 'not configured',
            groq: groqKey ? 'configured' : 'not configured',
          },
        });
      }

      const groqResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: systemInstruction || 'Voce e um util assistente.',
            },
            { role: 'user', content: prompt },
          ],
          temperature,
          response_format: jsonMode ? { type: 'json_object' } : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const text = groqResponse.data.choices?.[0]?.message?.content || '';
      return res.json({ text });
    } catch (groqError) {
      console.error(
        'Groq Fallback Error:',
        groqError.response?.data || groqError.message
      );
      return res.status(503).json({
        error:
          'Falha em todos os provedores de IA. Verifique as chaves de API no .env do servidor.',
        details: {
          gemini_error: geminiError.message,
          groq_error:
            groqError.response?.data?.error?.message || groqError.message,
        },
      });
    }
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

    const hydratedAgent = hydrateAgent(agent);

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

    const systemInstruction = buildMemorySystemPrompt(hydratedAgent, recentHistory);

    const config = await getOrgAIConfig(req.orgId);
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
      return res
        .status(400)
        .json({ error: 'Nenhuma chave de IA configurada.' });
    }

    let reply = '';

    // Agentes com ferramentas configuradas usam o orquestrador (ReAct/function
    // calling) no chat de teste, para a conversa se comportar igual ao WhatsApp.
    const hasActiveTools =
      Array.isArray(hydratedAgent?.tools) && hydratedAgent.tools.length > 0;
    if ((provider === 'gemini' || !provider) && hasActiveTools) {
      try {
        const orchestrator = new AgentOrchestrator(apiKey || null);
        const autonomousReply = await orchestrator.processAgentConversation({
          content: message,
          organizationId: req.orgId,
          agent: hydratedAgent,
          history: recentHistory,
          leadId: null,
        });
        if (autonomousReply) reply = autonomousReply;
      } catch (orchestratorError) {
        console.warn(
          '[AgentChat] Orquestrador indisponivel, usando fluxo padrao:',
          orchestratorError.message
        );
      }
    }

    if (!reply) {
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
            geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text ||
            '';
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

router.post(
  '/agents/:id/simulate',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const supabase = getSupabaseServer();
      const { id } = req.params;
      const { seed_message, turns = 6, session_id } = req.body;
      const organizationId = req.orgId;

      const { data: agent, error: agentError } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (agentError || !agent) {
        return res.status(404).json({ error: 'Agente nao encontrado.' });
      }

      const hydratedAgent = hydrateAgent(agent);

      const simulator = new ConversationSimulator();
      const result = await simulator.run({
        agent: hydratedAgent,
        organizationId,
        seedMessage: seed_message || 'oi',
        turns: Math.min(Number(turns) || 6, 12),
        sessionId: session_id,
      });

      res.json({ ...result, agent: { name: hydratedAgent.name, role: hydratedAgent.role } });
    } catch (error) {
      console.error('[AgentSimulate] Erro:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

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
