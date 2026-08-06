import axios from 'axios';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { AgentOrchestrator } from './agentOrchestrator.js';
import { buildAgentSystemPrompt } from './agentPrompt.js';
import logger from '../../utils/logger.js';

const LEAD_SIMULATION_PROMPT = `
Voce e um cliente brasileiro real interessado em imoveis, conversando com um corretor ou atendente de uma imobiliaria.
Regras:
- Responda em portugues brasileiro natural, mensagens curtas e informais.
- Nao saiba tudo de uma vez; va revelando informacoes gradualmente.
- Mostre interesse, duvidas, hesitacoes; as vezes mencione valores aproximados, cidade, tipo de imovel, quartos.
- Nao repita perguntas ja respondidas no historico.
- Nao use markdown.
- NUNCA mencione que e uma simulacao, teste, IA ou robo.
- Responda APENAS como o cliente, sem explicacoes adicionais.`;

function formatHistory(history = []) {
  return history
    .map((m) => `[${String(m.role || 'user').toUpperCase()}]: ${m.content}`)
    .join('\n');
}

export class ConversationSimulator {
  constructor(defaultApiKey = null) {
    this.defaultApiKey = defaultApiKey;
  }

  async _resolveProvider(organizationId) {
    const { getOrgAIConfig } = await import('../api/ai/helpers.js');
    const config = await getOrgAIConfig(organizationId);
    const provider = config?.namoBana?.apiKey
      ? 'namobana'
      : config?.openai?.apiKey
        ? 'openai'
        : 'gemini';
    const apiKey =
      config?.namoBana?.apiKey ||
      config?.openai?.apiKey ||
      this.defaultApiKey ||
      process.env.GEMINI_API_KEY ||
      '';
    return { provider, apiKey: String(apiKey || ''), config };
  }

  async _ensureGemini(apiKey, organizationId) {
    const validKey = apiKey && !apiKey.includes('YOUR_') && apiKey.length > 20;
    if (validKey) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    const supabase = getSupabaseServer();
    const { data: saasSettings } = await supabase
      .from('saas_settings')
      .select('global_gemini_key')
      .single()
      .catch(() => ({ data: null }));

    const finalKey = saasSettings?.global_gemini_key;
    if (!finalKey)
      throw new Error('Nenhuma chave Gemini disponivel para simulacao.');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(finalKey);
    return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async _callGemini(model, systemInstruction, history, message) {
    const contents = [];
    if (systemInstruction) {
      contents.push({
        role: 'user',
        parts: [
          {
            text: `[INSTRUCAO DO SISTEMA]\n${systemInstruction}`,
          },
        ],
      });
      contents.push({
        role: 'model',
        parts: [
          { text: 'Entendido. Vou responder de acordo com as instrucoes.' },
        ],
      });
    }

    const mappedHistory = (history || []).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    contents.push(...mappedHistory);
    contents.push({ role: 'user', parts: [{ text: message }] });

    const result = await model.generateContent({
      contents,
      generationConfig: { temperature: 0.75 },
    });
    return result.response.text().trim();
  }

  async _callOpenAI(apiKey, systemInstruction, history, message) {
    const messages = [
      { role: 'system', content: systemInstruction },
      ...(history || []).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages,
        temperature: 0.75,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices?.[0]?.message?.content?.trim() || '';
  }

  async _callGroq(apiKey, systemInstruction, history, message) {
    const messages = [
      { role: 'system', content: systemInstruction },
      ...(history || []).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.75,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices?.[0]?.message?.content?.trim() || '';
  }

  async _generateAgentReply({
    agent,
    history,
    organizationId,
    provider,
    apiKey,
  }) {
    const systemInstruction = buildAgentSystemPrompt(agent, {
      history,
      channel: 'WhatsApp',
    });

    const hasActiveTools =
      Array.isArray(agent?.tools) && agent.tools.length > 0;
    if ((provider === 'gemini' || !provider) && hasActiveTools) {
      try {
        const orchestrator = new AgentOrchestrator(apiKey || null);
        const reply = await orchestrator.processAgentConversation({
          content: history[history.length - 1]?.content || '',
          organizationId,
          agent,
          history,
          leadId: null,
        });
        if (reply) return reply;
      } catch (err) {
        logger.warn(
          '[Sim] Orquestrador indisponivel, usando fluxo padrao:',
          err.message
        );
      }
    }

    if (provider === 'gemini' || !provider) {
      try {
        const model = await this._ensureGemini(apiKey, organizationId);
        return this._callGemini(
          model,
          systemInstruction,
          history.slice(0, -1),
          history[history.length - 1]?.content || ''
        );
      } catch (err) {
        logger.warn('[Sim] Gemini falhou, usando Groq:', err.message);
      }
    }

    if (provider === 'openai' && apiKey) {
      try {
        return await this._callOpenAI(
          apiKey,
          systemInstruction,
          history.slice(0, -1),
          history[history.length - 1]?.content || ''
        );
      } catch (err) {
        logger.warn('[Sim] OpenAI falhou, usando Groq:', err.message);
      }
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        return await this._callGroq(
          groqKey,
          systemInstruction,
          history.slice(0, -1),
          history[history.length - 1]?.content || ''
        );
      } catch (err) {
        logger.warn('[Sim] Groq falhou:', err.message);
      }
    }

    return '';
  }

  async _generateLeadReply(provider, apiKey, history) {
    const lastAgentMessage = [...history]
      .reverse()
      .find((m) => m.role === 'assistant');
    if (!lastAgentMessage) return '';

    if (provider === 'gemini' || !provider) {
      try {
        const model = await this._ensureGemini(apiKey, '');
        const text = await this._callGemini(
          model,
          LEAD_SIMULATION_PROMPT,
          history,
          lastAgentMessage.content
        );
        if (text) return text;
      } catch {
        // fallback Groq
      }
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const text = await this._callGroq(
          groqKey,
          LEAD_SIMULATION_PROMPT,
          history,
          lastAgentMessage.content
        );
        if (text) return text;
      } catch {
        // fallback OpenAI
      }
    }

    if (provider === 'openai' && apiKey) {
      try {
        const text = await this._callOpenAI(
          apiKey,
          LEAD_SIMULATION_PROMPT,
          history,
          lastAgentMessage.content
        );
        if (text) return text;
      } catch {
        // ignore
      }
    }

    return '';
  }

  async _saveMemory(organizationId, agentId, sessionId, role, content) {
    try {
      const supabase = getSupabaseServer();
      await supabase.from('conversation_memory').insert({
        organization_id: organizationId,
        agent_id: agentId || null,
        session_id: sessionId,
        role,
        content: String(content).slice(0, 3000),
      });
    } catch (err) {
      logger.warn('[Sim] Erro ao salvar memoria:', err.message);
    }
  }

  async run({
    agent,
    organizationId,
    seedMessage = 'oi',
    turns = 6,
    sessionId: providedSessionId,
  }) {
    if (!agent) throw new Error('Agente nao fornecido para simulacao.');

    const { provider, apiKey } = await this._resolveProvider(organizationId);
    if (!apiKey) {
      throw new Error('Nenhuma chave de IA configurada para simulacao.');
    }

    const sessionId = providedSessionId || `sim-${agent.id}-${Date.now()}`;
    const history = [];
    const transcript = [];

    await this._saveMemory(
      organizationId,
      agent.id,
      sessionId,
      'user',
      seedMessage
    );
    history.push({ role: 'user', content: seedMessage });
    transcript.push({
      role: 'lead',
      content: seedMessage,
      timestamp: new Date().toISOString(),
    });

    for (let i = 0; i < turns; i++) {
      const agentReply = await this._generateAgentReply({
        agent,
        history,
        organizationId,
        provider,
        apiKey,
      });

      if (!agentReply) break;

      await this._saveMemory(
        organizationId,
        agent.id,
        sessionId,
        'assistant',
        agentReply
      );
      history.push({ role: 'assistant', content: agentReply });
      transcript.push({
        role: 'agent',
        content: agentReply,
        timestamp: new Date().toISOString(),
      });

      const leadReply = await this._generateLeadReply(
        provider,
        apiKey,
        history
      );
      if (!leadReply) break;

      await this._saveMemory(
        organizationId,
        agent.id,
        sessionId,
        'user',
        leadReply
      );
      history.push({ role: 'user', content: leadReply });
      transcript.push({
        role: 'lead',
        content: leadReply,
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true, transcript, session_id: sessionId };
  }
}

export const conversationSimulator = new ConversationSimulator();
