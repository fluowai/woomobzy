import { getSupabaseServer } from '../../lib/supabase-server.js';
import logger from '../../utils/logger.js';

const REAL_ESTATE_SIGNALS = /\b(imovel|casa|apartamento|terreno|fazenda|sitio|chacara|area|hectare|ha\b|alqueire|comprar|vender|alugar|locacao|arrendar|visita|proposta|financiamento|entrada|parcela|car\b|matricula|ccir|incra|geo|itr|contrato|aluguel|locar|imobiliaria|corretor|crm|lead|cliente)\b/i;

const SENSITIVE_TOPICS = /\b(politica|eleicao|partido|presidente|religiao|deus|igreja|macumba|candomble|evangelico|catolico|muçulmano|judeu|atleta|time|futebol|flamengo|palmeiras|saude|doenca|medicamento|remédio|doutor|medico|advogado|processo|judicial|sentenca|dinheiro|emprestimo|investimento|bitcoin|cripto|bolsa|acoes|aposta|cassino|jogo|sexo|pornografia|drogas|maconha|cocaina|arma|disparo|assalto|roubo|hack|invasao|senha|cpf|rg|documento)\b/i;

const OFF_TOPIC_DRIFT_SIGNALS = /\b(piada|meme|musica|filme|serie|jogo|noticia|clima|tempo|chuva|sol|futebol|esporte|aniversario|festas|viagem|passagem|hotel)\b/i;

const SPAM_PATTERNS = [
  /^(.)\1{10,}$/,
  /^(teste|test|oi|ola|hey|eai|fala|blz){3,}$/i,
  /^(.)\1{4,}\s*(.)\2{4,}\s*(.)\3{4,}$/,
];

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 10;
const DEFAULT_MAX_TURNS = 50;

export class AgentGuardrails {
  constructor() {
    this._rateLimitCache = new Map();
  }

  async _getGuardrailsConfig(supabase, organizationId, agentId = null) {
    const defaultConfig = {
      strict_context_mode: true,
      allowed_topics: [],
      blocked_topics: [],
      max_conversation_turns: DEFAULT_MAX_TURNS,
      off_topic_redirect_message: 'No momento eu ajudo apenas com imoveis. Posso te ajudar a encontrar o imovel ideal?',
      max_off_topic_attempts: 2,
      rate_limit_per_minute: DEFAULT_RATE_LIMIT,
      off_hours_auto_reply: true,
      off_hours_message: 'Estamos em horario de atendimento. Deixe sua mensagem que retornamos em breve.',
    };

    if (!organizationId) return defaultConfig;

    try {
      let query = supabase
        .from('agent_guardrails_config')
        .select('*')
        .eq('organization_id', organizationId);

      if (agentId) query = query.eq('agent_id', agentId);
      const { data } = await query.maybeSingle();

      if (!data) return defaultConfig;

      return {
        strict_context_mode: data.strict_context_mode ?? defaultConfig.strict_context_mode,
        allowed_topics: Array.isArray(data.allowed_topics) ? data.allowed_topics : defaultConfig.allowed_topics,
        blocked_topics: Array.isArray(data.blocked_topics) ? data.blocked_topics : defaultConfig.blocked_topics,
        max_conversation_turns: data.max_conversation_turns || defaultConfig.max_conversation_turns,
        off_topic_redirect_message: data.off_topic_redirect_message || defaultConfig.off_topic_redirect_message,
        max_off_topic_attempts: data.max_off_topic_attempts || defaultConfig.max_off_topic_attempts,
        rate_limit_per_minute: data.rate_limit_per_minute || defaultConfig.rate_limit_per_minute,
        off_hours_auto_reply: data.off_hours_auto_reply ?? defaultConfig.off_hours_auto_reply,
        off_hours_message: data.off_hours_message || defaultConfig.off_hours_message,
      };
    } catch (err) {
      logger.warn('[Guardrails] Erro ao carregar config:', err.message);
      return defaultConfig;
    }
  }

  isRealEstateContext(text) {
    const normalized = String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return REAL_ESTATE_SIGNALS.test(normalized);
  }

  hasSensitiveContent(text) {
    const normalized = String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return SENSITIVE_TOPICS.test(normalized);
  }

  detectTopicDrift(history, currentMessage) {
    if (!Array.isArray(history) || history.length < 2) return { drifted: false, attempts: 0 };

    const recentMessages = history.slice(-6).map((m) => m.content || '');
    const offTopicCount = recentMessages.filter((msg) => this._isOffTopicMessage(msg)).length;

    const currentIsOffTopic = this._isOffTopicMessage(currentMessage);
    const totalOffTopic = offTopicCount + (currentIsOffTopic ? 1 : 0);

    return {
      drifted: totalOffTopic >= 2,
      attempts: totalOffTopic,
      currentIsOffTopic,
    };
  }

  _isOffTopicMessage(text) {
    const normalized = String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (!this.isRealEstateContext(normalized)) return true;
    if (OFF_TOPIC_DRIFT_SIGNALS.test(normalized) && !REAL_ESTATE_SIGNALS.test(normalized)) return true;
    return false;
  }

  async checkRateLimit(phone, organizationId) {
    const supabase = getSupabaseServer();
    const config = this._getGuardrailsConfig(supabase, organizationId);
    const limit = config.rate_limit_per_minute || DEFAULT_RATE_LIMIT;

    const now = Date.now();
    const key = `${organizationId}:${phone}`;
    const timestamps = this._rateLimitCache.get(key) || [];

    const recentTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    recentTimestamps.push(now);
    this._rateLimitCache.set(key, recentTimestamps);

    if (recentTimestamps.length > limit) {
      logger.warn(`[Guardrails] Rate limit excedido para ${phone}: ${recentTimestamps.length} msgs/min`);
      return { exceeded: true, count: recentTimestamps.length, limit };
    }

    return { exceeded: false, count: recentTimestamps.length, limit };
  }

  isSpam(text) {
    const normalized = String(text || '').trim();
    if (!normalized) return false;

    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(normalized)) return true;
    }

    const charCounts = {};
    for (const char of normalized) {
      charCounts[char] = (charCounts[char] || 0) + 1;
      if (charCounts[char] > normalized.length * 0.7) return true;
    }

    return false;
  }

  isConversationTooLong(history) {
    if (!Array.isArray(history)) return false;
    const config = this._getGuardrailsConfig(null, null);
    const maxTurns = config.max_conversation_turns || DEFAULT_MAX_TURNS;
    return history.length >= maxTurns;
  }

  async shouldHandoffToHuman(actionPlan, history) {
    if (!actionPlan) return false;
    if (actionPlan.handoffRequired) return true;

    const drift = this.detectTopicDrift(history, '');
    if (drift.drifted) return true;

    const confidence = Number(actionPlan.confidence || 0);
    if (confidence < 0.3 && actionPlan.leadType === 'outro') return true;

    const personalCount = (history || []).filter(
      (m) => m.role === 'user' && /familia|amigo|pessoal|fornecedor|interno/i.test(m.content || '')
    ).length;
    if (personalCount >= 3) return true;

    return false;
  }

  buildOffTopicRedirect(_agentName) {
    return 'No momento eu ajudo apenas com imoveis. Posso te ajudar a encontrar o imovel ideal?';
  }

  buildSensitiveTopicRedirect() {
    return 'Nao posso ajudar com esse assunto. Vamos falar de imoveis?';
  }

  buildRateLimitRedirect() {
    return 'Estou recebendo muitas mensagens. Um momento, por favor.';
  }

  buildOffHoursRedirect(config) {
    return config?.off_hours_message || 'Estamos em horario de atendimento. Deixe sua mensagem que retornamos em breve.';
  }

  buildMaxTurnsRedirect() {
    return 'Para melhor atendimento, vou transferir voce para um dos nossos corretores. Eles entrarao em contato em breve.';
  }
}

export const guardrails = new AgentGuardrails();