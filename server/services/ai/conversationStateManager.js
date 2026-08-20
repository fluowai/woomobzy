/**
 * Conversation State Manager
 * 
 * Manages structured conversation state per conversation including:
 * - Slot tracking (filled/missing/refused/unknown/not_applicable)
 * - Short-term memory (recent messages)
 * - Structured state (extracted information)
 * - Lead memory (CRM-linked data)
 * - Anti-repetition engine (Question Deduplication)
 * - Context preservation across handoffs
 */

import { getSupabaseServer } from '../../lib/supabase-server.js';
import { logger } from '../../utils/logger.js';

// ============================================================
// TYPES
// ============================================================

/**
 * @typedef {Object} SlotState
 * @property {'filled'|'missing'|'refused'|'unknown'|'not_applicable'} status
 * @property {*} value
 * @property {string} source - 'user_message'|'tool_result'|'crm'|'inferred'
 * @property {number} confidence
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} ConversationState
 * @property {string} conversationId
 * @property {string} organizationId
 * @property {string} channel
 * @property {string} instanceId
 * @property {string} leadId
 * @property {string} currentAgentId
 * @property {string} intent
 * @property {number} intentConfidence
 * @property {Object.<string, SlotState>} slots
 * @property {Object} context - Short-term memory
 * @property {Object} leadMemory - CRM-linked data
 * @property {string} status
 * @property {string} aiPausedAt
 * @property {string} humanOwnerId
 * @property {Object[]} messageHistory - Recent messages for context
 * @property {Object[]} questionHistory - Tracked questions for anti-repetition
 */

// ============================================================
// QUESTION DEDUPLICATION ENGINE (Anti-Repetition)
// ============================================================

export class QuestionDeduplicationEngine {
  constructor() {
    // Semantic similarity threshold for considering questions equivalent
    this.SIMILARITY_THRESHOLD = 0.85;
    this.MAX_QUESTION_HISTORY = 50;
  }

  /**
   * Check if a question can be asked (not repeated)
   * @param {string} question - The question to check
   * @param {ConversationState} state - Current conversation state
   * @returns {Promise<{canAsk: boolean, reason?: string, existingAnswer?: *}>}
   */
  async canAsk(question, state) {
    const normalizedQuestion = this.normalizeQuestion(question);
    
    // 1. Check exact match in question history
    const exactMatch = state.questionHistory?.find(q => 
      this.normalizeQuestion(q.question) === normalizedQuestion
    );
    if (exactMatch) {
      return {
        canAsk: false,
        reason: 'EXACT_DUPLICATE',
        existingAnswer: exactMatch.answer,
        slotKey: exactMatch.slotKey
      };
    }

    // 2. Check semantic similarity with previous questions
    for (const q of state.questionHistory || []) {
      const similarity = this.calculateSimilarity(normalizedQuestion, this.normalizeQuestion(q.question));
      if (similarity >= this.SIMILARITY_THRESHOLD) {
        return {
          canAsk: false,
          reason: 'SEMANTIC_DUPLICATE',
          similarity,
          existingAnswer: q.answer,
          slotKey: q.slotKey
        };
      }
    }

    // 3. Check if data already exists in slots
    const slotKey = this.inferSlotKey(question, state);
    if (slotKey && state.slots?.[slotKey]?.status === 'filled') {
      return {
        canAsk: false,
        reason: 'SLOT_ALREADY_FILLED',
        existingAnswer: state.slots[slotKey].value,
        slotKey
      };
    }

    // 4. Check if data available from CRM/lead_memory
    const crmData = this.checkCrmData(question, state);
    if (crmData.found) {
      return {
        canAsk: false,
        reason: 'DATA_IN_CRM',
        existingAnswer: crmData.value,
        slotKey: crmData.slotKey
      };
    }

    // 5. Check if data obtained via tools
    const toolData = this.checkToolResults(question, state);
    if (toolData.found) {
      return {
        canAsk: false,
        reason: 'DATA_FROM_TOOL',
        existingAnswer: toolData.value,
        slotKey: toolData.slotKey
      };
    }

    return { canAsk: true };
  }

  /**
   * Record a question that was asked
   */
  recordQuestion(state, question, slotKey = null) {
    if (!state.questionHistory) state.questionHistory = [];
    
    state.questionHistory.push({
      question,
      normalizedQuestion: this.normalizeQuestion(question),
      slotKey,
      askedAt: new Date().toISOString(),
      answer: null // Filled when answer received
    });

    // Trim history
    if (state.questionHistory.length > this.MAX_QUESTION_HISTORY) {
      state.questionHistory = state.questionHistory.slice(-this.MAX_QUESTION_HISTORY);
    }
  }

  /**
   * Record answer to a question
   */
  recordAnswer(state, question, answer, slotKey = null) {
    const normalizedQuestion = this.normalizeQuestion(question);
    
    // Find and update the question record
    for (const q of state.questionHistory || []) {
      if (q.normalizedQuestion === normalizedQuestion || q.question === question) {
        q.answer = answer;
        q.answeredAt = new Date().toISOString();
        if (slotKey) q.slotKey = slotKey;
        break;
      }
    }
  }

  /**
   * Normalize question for comparison
   */
  normalizeQuestion(question) {
    return question
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate semantic similarity (simple Jaccard for now)
   * In production, use embeddings for better semantic matching
   */
  calculateSimilarity(q1, q2) {
    const words1 = new Set(q1.split(' ').filter(w => w.length > 2));
    const words2 = new Set(q2.split(' ').filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Infer which slot a question relates to
   */
  inferSlotKey(question, state) {
    const q = question.toLowerCase();
    
    // Direct slot keywords mapping
    const slotKeywords = {
      name: ['nome', 'chama', 'identifique'],
      phone: ['telefone', 'celular', 'whatsapp', 'contato', 'número'],
      email: ['email', 'e-mail', 'e mail'],
      city: ['cidade', 'município', 'onde mora', 'localização'],
      neighborhood: ['bairro', 'região', 'zona'],
      property_type: ['tipo', 'apartamento', 'casa', 'terreno', 'fazenda', 'sítio', 'chácara', 'lote'],
      bedrooms: ['quarto', 'dormitório', 'qtos'],
      budget_max: ['orçamento', 'valor', 'preço', 'quanto', 'máximo', 'teto', 'limite'],
      rent_max: ['aluguel', 'valor do aluguel', 'quanto de aluguel'],
      financing: ['financiar', 'financiamento', 'entrada', 'parcela', 'banco'],
      income: ['renda', 'ganha', 'salário', 'ganhos'],
      timeline: ['quando', 'prazo', 'tempo', 'urgência'],
      move_in_date: ['mudança', 'mudar', 'entrar', 'disponível'],
      guarantor_type: ['fiador', 'garantia', 'seguro fiança', 'título'],
      pets: ['animal', 'pet', 'cachorro', 'gato'],
      purpose: ['finalidade', 'pecuária', 'agricultura', 'lazer', 'investimento'],
      area_min_ha: ['hectare', 'alqueire', 'tamanho', 'área mínima'],
      area_max_ha: ['área máxima', 'maior'],
      topography: ['topografia', 'plana', 'ondulada', 'montanhosa'],
      water_resources: ['água', 'rio', 'nascentes', 'açude', 'poço'],
      soil_type: ['solo', 'terra', 'latossolo', 'argissolo'],
      car_status: ['car', 'cadastro ambiental'],
      documentation: ['documentação', 'matrícula', 'ccir', 'itr', 'georreferenciamento'],
      development_id: ['empreendimento', 'condomínio', 'loteamento'],
      unit_type: ['unidade', 'cobertura', 'garden', 'studio'],
      stand_visit: ['stand', 'decorado', 'visitar stand'],
      lot_type: ['lote', 'residencial', 'comercial', 'industrial'],
      area_min_m2: ['metro quadrado', 'm²', 'metragem'],
      financing_type: ['financiamento próprio', 'banco', 'consórcio'],
      down_payment_pct: ['entrada', 'porcentagem', '%'],
      block_preference: ['quadra', 'bloco']
    };

    for (const [slotKey, keywords] of Object.entries(slotKeywords)) {
      if (keywords.some(kw => q.includes(kw))) {
        return slotKey;
      }
    }

    return null;
  }

  /**
   * Check if data exists in CRM/lead_memory
   */
  checkCrmData(question, state) {
    const slotKey = this.inferSlotKey(question, state);
    if (!slotKey) return { found: false };
    
    const leadMemory = state.leadMemory || {};
    
    // Direct mapping from lead_memory fields
    const crmFieldMap = {
      name: 'name',
      phone: 'phone',
      email: 'email',
      city: 'city',
      neighborhood: 'neighborhood',
      budget_max: 'budget',
      property_type: 'property_type',
      bedrooms: 'bedrooms'
    };
    
    const crmField = crmFieldMap[slotKey];
    if (crmField && leadMemory[crmField] !== undefined && leadMemory[crmField] !== null) {
      return { found: true, value: leadMemory[crmField], slotKey };
    }
    
    return { found: false };
  }

  /**
   * Check if data was obtained via tool results
   */
  checkToolResults(question, state) {
    const slotKey = this.inferSlotKey(question, state);
    if (!slotKey) return { found: false };
    
    // Check context for tool results
    const context = state.context || {};
    const toolResults = context.toolResults || [];
    
    for (const result of toolResults) {
      if (result.tool === 'properties.search' && result.data?.results) {
        // Properties found - can answer availability questions
        if (['property_type', 'city', 'budget_max', 'bedrooms'].includes(slotKey)) {
          return { found: true, value: result.data.results, slotKey };
        }
      }
      if (result.tool === 'crm.leads.read' && result.data) {
        // Lead data from CRM
        const crmFieldMap = {
          name: 'name',
          phone: 'phone',
          email: 'email',
          budget_max: 'budget'
        };
        const field = crmFieldMap[slotKey];
        if (field && result.data[field]) {
          return { found: true, value: result.data[field], slotKey };
        }
      }
    }
    
    return { found: false };
  }
}

// ============================================================
// CONVERSATION STATE MANAGER
// ============================================================

export class ConversationStateManager {
  constructor() {
    this.deduplicationEngine = new QuestionDeduplicationEngine();
    this.memoryCache = new Map(); // In-memory cache for hot conversations
    this.CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Get or create conversation state
   */
  async getOrCreateState(organizationId, conversationId, channel, instanceId = null) {
    const cacheKey = `${organizationId}:${conversationId}`;
    
    // Check memory cache first
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.state;
    }

    const supabase = getSupabaseServer();
    
    // Try to load from database
    const { data: existing } = await supabase
      .from('ai_conversation_states')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('conversation_id', conversationId)
      .single();

    let state;
    if (existing) {
      state = {
        conversationId: existing.conversation_id,
        organizationId: existing.organization_id,
        channel: existing.channel,
        instanceId: existing.instance_id,
        leadId: existing.lead_id,
        currentAgentId: existing.current_agent_id,
        intent: existing.intent,
        intentConfidence: existing.intent_confidence,
        slots: existing.slots || {},
        context: existing.context || {},
        leadMemory: existing.lead_memory || {},
        status: existing.status,
        aiPausedAt: existing.ai_paused_at,
        humanOwnerId: existing.human_owner_id,
        messageHistory: [],
        questionHistory: [],
        updatedAt: existing.updated_at
      };
      
      // Load recent message history
      state.messageHistory = await this.loadMessageHistory(organizationId, conversationId, 20);
      
      // Load question history from execution logs
      state.questionHistory = await this.loadQuestionHistory(organizationId, conversationId);
    } else {
      // Create new state
      state = {
        conversationId,
        organizationId,
        channel,
        instanceId,
        leadId: null,
        currentAgentId: null,
        intent: null,
        intentConfidence: 0,
        slots: {},
        context: { toolResults: [] },
        leadMemory: {},
        status: 'ACTIVE',
        aiPausedAt: null,
        humanOwnerId: null,
        messageHistory: [],
        questionHistory: [],
        updatedAt: new Date().toISOString()
      };
      
      // Persist new state
      await this.persistState(state);
    }

    // Cache in memory
    this.memoryCache.set(cacheKey, {
      state,
      expires: Date.now() + this.CACHE_TTL
    });

    return state;
  }

  /**
   * Update conversation state (slots, intent, context, etc.)
   */
  async updateState(organizationId, conversationId, updates) {
    const state = await this.getOrCreateState(organizationId, conversationId, updates.channel || 'unknown');
    
    // Apply updates
    if (updates.intent !== undefined) {
      state.intent = updates.intent;
    }
    if (updates.intentConfidence !== undefined) {
      state.intentConfidence = updates.intentConfidence;
    }
    if (updates.currentAgentId !== undefined) {
      state.currentAgentId = updates.currentAgentId;
    }
    if (updates.leadId !== undefined) {
      state.leadId = updates.leadId;
      // Sync lead memory when lead is attached
      if (updates.leadId) {
        await this.syncLeadMemory(state);
      }
    }
    if (updates.slots) {
      // Merge slot updates
      for (const [key, slotUpdate] of Object.entries(updates.slots)) {
        state.slots[key] = {
          ...state.slots[key],
          ...slotUpdate,
          updatedAt: new Date().toISOString()
        };
      }
    }
    if (updates.context) {
      state.context = { ...state.context, ...updates.context };
    }
    if (updates.status) {
      state.status = updates.status;
    }
    if (updates.aiPausedAt !== undefined) {
      state.aiPausedAt = updates.aiPausedAt;
    }
    if (updates.humanOwnerId !== undefined) {
      state.humanOwnerId = updates.humanOwnerId;
    }
    
    state.updatedAt = new Date().toISOString();
    
    // Persist
    await this.persistState(state);
    
    // Update cache
    const cacheKey = `${organizationId}:${conversationId}`;
    this.memoryCache.set(cacheKey, {
      state,
      expires: Date.now() + this.CACHE_TTL
    });
    
    return state;
  }

  /**
   * Add message to history
   */
  async addMessage(organizationId, conversationId, role, content, metadata = {}) {
    const state = await this.getOrCreateState(organizationId, conversationId, metadata.channel);
    
    const message = {
      role,
      content,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    state.messageHistory.push(message);
    
    // Keep only last 50 messages in memory
    if (state.messageHistory.length > 50) {
      state.messageHistory = state.messageHistory.slice(-50);
    }
    
    // Persist to conversation_memory table
    const supabase = getSupabaseServer();
    await supabase.from('conversation_memory').insert({
      organization_id: organizationId,
      session_id: conversationId,
      role: role === 'assistant' ? 'assistant' : 'user',
      content,
      metadata: { ...metadata, ...message.metadata }
    });
    
    return state;
  }

  /**
   * Record tool result in context
   */
  async recordToolResult(organizationId, conversationId, toolName, input, result) {
    const state = await this.getOrCreateState(organizationId, conversationId, 'unknown');
    
    const toolResult = {
      tool: toolName,
      input,
      result,
      timestamp: new Date().toISOString()
    };
    
    if (!state.context.toolResults) state.context.toolResults = [];
    state.context.toolResults.push(toolResult);
    
    // Keep last 20 tool results
    if (state.context.toolResults.length > 20) {
      state.context.toolResults = state.context.toolResults.slice(-20);
    }
    
    await this.persistState(state);
    return state;
  }

  /**
   * Check if a question can be asked (Anti-Repetition)
   */
  async canAskQuestion(organizationId, conversationId, question, channel) {
    const state = await this.getOrCreateState(organizationId, conversationId, channel);
    return await this.deduplicationEngine.canAsk(question, state);
  }

  /**
   * Record question asked
   */
  async recordQuestionAsked(organizationId, conversationId, question, channel, slotKey = null) {
    const state = await this.getOrCreateState(organizationId, conversationId, channel);
    this.deduplicationEngine.recordQuestion(state, question, slotKey);
    await this.persistState(state);
  }

  /**
   * Record answer received
   */
  async recordAnswerReceived(organizationId, conversationId, question, answer, channel, slotKey = null) {
    const state = await this.getOrCreateState(organizationId, conversationId, channel);
    this.deduplicationEngine.recordAnswer(state, question, answer, slotKey);
    
    // Also update slot if we know which one
    if (slotKey) {
      state.slots[slotKey] = {
        status: 'filled',
        value: answer,
        source: 'user_message',
        confidence: 0.95,
        updatedAt: new Date().toISOString()
      };
    }
    
    await this.persistState(state);
  }

  /**
   * Execute handoff between agents
   */
  async executeHandoff(organizationId, conversationId, fromAgentId, toAgentId, reason, summary) {
    const state = await this.getOrCreateState(organizationId, conversationId, 'unknown');
    
    // Log handoff
    const supabase = getSupabaseServer();
    await supabase.from('ai_handoffs').insert({
      organization_id: organizationId,
      from_agent_id: fromAgentId,
      to_agent_id: toAgentId,
      conversation_id: conversationId,
      lead_id: state.leadId,
      trigger_type: reason,
      summary,
      state_snapshot: {
        slots: state.slots,
        context: state.context,
        intent: state.intent,
        messageCount: state.messageHistory.length
      }
    });
    
    // Update current agent
    state.currentAgentId = toAgentId;
    state.updatedAt = new Date().toISOString();
    
    await this.persistState(state);
    
    return state;
  }

  /**
   * Pause AI (human takeover)
   */
  async pauseAI(organizationId, conversationId, humanOwnerId) {
    const state = await this.getOrCreateState(organizationId, conversationId, 'unknown');
    
    state.status = 'PAUSED_BY_HUMAN';
    state.aiPausedAt = new Date().toISOString();
    state.humanOwnerId = humanOwnerId;
    
    await this.persistState(state);
    return state;
  }

  /**
   * Resume AI
   */
  async resumeAI(organizationId, conversationId) {
    const state = await this.getOrCreateState(organizationId, conversationId, 'unknown');
    
    state.status = 'ACTIVE';
    state.aiPausedAt = null;
    state.humanOwnerId = null;
    
    await this.persistState(state);
    return state;
  }

  /**
   * Close conversation
   */
  async closeConversation(organizationId, conversationId) {
    const state = await this.getOrCreateState(organizationId, conversationId, 'unknown');
    
    state.status = 'CLOSED';
    state.updatedAt = new Date().toISOString();
    
    await this.persistState(state);
    
    // Remove from cache
    const cacheKey = `${organizationId}:${conversationId}`;
    this.memoryCache.delete(cacheKey);
    
    return state;
  }

  /**
   * Sync lead memory from CRM
   */
  async syncLeadMemory(state) {
    if (!state.leadId) return;
    
    const supabase = getSupabaseServer();
    
    const { data: lead } = await supabase
      .from('leads')
      .select('name, phone, email, budget, city, neighborhood, property_type, bedrooms, classification, status, ai_profile, matched_properties')
      .eq('id', state.leadId)
      .eq('organization_id', state.organizationId)
      .single();
    
    if (lead) {
      state.leadMemory = {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        budget: lead.budget,
        city: lead.city,
        neighborhood: lead.neighborhood,
        property_type: lead.property_type,
        bedrooms: lead.bedrooms,
        classification: lead.classification,
        status: lead.status,
        ai_profile: lead.ai_profile,
        matched_properties: lead.matched_properties
      };
    }
  }

  /**
   * Load recent message history
   */
  async loadMessageHistory(organizationId, conversationId, limit = 20) {
    const supabase = getSupabaseServer();
    
    const { data } = await supabase
      .from('conversation_memory')
      .select('role, content, metadata, created_at')
      .eq('organization_id', organizationId)
      .eq('session_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);
    
    return data?.map(m => ({
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      timestamp: m.created_at
    })) || [];
  }

  /**
   * Load question history from execution logs
   */
  async loadQuestionHistory(organizationId, conversationId) {
    const supabase = getSupabaseServer();
    
    const { data } = await supabase
      .from('ai_execution_logs')
      .select('input_json, output_json, executed_at')
      .eq('tenant_id', organizationId)
      .eq('conversation_id', conversationId)
      .eq('event_type', 'AGENT_QUESTION')
      .order('executed_at', { ascending: true })
      .limit(50);
    
    return data?.map(log => ({
      question: log.input_json?.question,
      normalizedQuestion: log.input_json?.question?.toLowerCase().trim(),
      answer: log.output_json?.answer,
      slotKey: log.input_json?.slotKey,
      askedAt: log.executed_at
    })) || [];
  }

  /**
   * Persist state to database
   */
  async persistState(state) {
    const supabase = getSupabaseServer();
    
    const { error } = await supabase
      .from('ai_conversation_states')
      .upsert({
        organization_id: state.organizationId,
        conversation_id: state.conversationId,
        channel: state.channel,
        instance_id: state.instanceId,
        lead_id: state.leadId,
        current_agent_id: state.currentAgentId,
        intent: state.intent,
        intent_confidence: state.intentConfidence,
        slots: state.slots,
        context: state.context,
        lead_memory: state.leadMemory,
        status: state.status,
        ai_paused_at: state.aiPausedAt,
        human_owner_id: state.humanOwnerId,
        updated_at: state.updatedAt
      }, {
        onConflict: 'organization_id,conversation_id'
      });
    
    if (error) {
      logger.error('[ConversationStateManager] Failed to persist state', { 
        error: error.message, 
        conversationId: state.conversationId 
      });
    }
  }

  /**
   * Get state for display in sandbox/testing
   */
  async getStateForDisplay(organizationId, conversationId, channel) {
    const state = await this.getOrCreateState(organizationId, conversationId, channel);
    
    // Format slots for display
    const slotsDisplay = {
      filled: [],
      missing: [],
      refused: [],
      unknown: [],
      notApplicable: []
    };
    
    for (const [key, slot] of Object.entries(state.slots || {})) {
      const display = {
        key,
        label: this.getSlotLabel(key),
        value: slot.value,
        confidence: slot.confidence,
        source: slot.source
      };
      
      if (slot.status === 'filled') slotsDisplay.filled.push(display);
      else if (slot.status === 'missing') slotsDisplay.missing.push(display);
      else if (slot.status === 'refused') slotsDisplay.refused.push(display);
      else if (slot.status === 'unknown') slotsDisplay.unknown.push(display);
      else if (slot.status === 'not_applicable') slotsDisplay.notApplicable.push(display);
    }
    
    return {
      conversationId: state.conversationId,
      intent: state.intent,
      intentConfidence: state.intentConfidence,
      currentAgentId: state.currentAgentId,
      status: state.status,
      slots: slotsDisplay,
      leadMemory: state.leadMemory,
      recentMessages: state.messageHistory.slice(-10),
      toolResults: state.context?.toolResults?.slice(-5) || [],
      aiPausedAt: state.aiPausedAt,
      humanOwnerId: state.humanOwnerId
    };
  }

  getSlotLabel(key) {
    const labels = {
      name: 'Nome',
      phone: 'Telefone',
      email: 'E-mail',
      city: 'Cidade',
      neighborhood: 'Bairro',
      property_type: 'Tipo de Imóvel',
      bedrooms: 'Quartos',
      budget_max: 'Orçamento Máximo',
      rent_max: 'Aluguel Máximo',
      financing: 'Financiamento',
      income: 'Renda',
      timeline: 'Prazo',
      move_in_date: 'Data de Mudança',
      guarantor_type: 'Tipo de Garantia',
      pets: 'Animais',
      purpose: 'Finalidade',
      area_min_ha: 'Área Mínima (ha)',
      area_max_ha: 'Área Máxima (ha)',
      topography: 'Topografia',
      water_resources: 'Recursos Hídricos',
      soil_type: 'Tipo de Solo',
      car_status: 'CAR',
      documentation: 'Documentação',
      development_id: 'Empreendimento',
      unit_type: 'Tipo de Unidade',
      stand_visit: 'Visita ao Stand',
      lot_type: 'Tipo de Lote',
      area_min_m2: 'Área Mínima (m²)',
      financing_type: 'Tipo de Financiamento',
      down_payment_pct: 'Entrada (%)',
      block_preference: 'Quadra Preferida'
    };
    return labels[key] || key;
  }
}

// Singleton
let stateManagerInstance = null;

export function getConversationStateManager() {
  if (!stateManagerInstance) {
    stateManagerInstance = new ConversationStateManager();
  }
  return stateManagerInstance;
}

export default ConversationStateManager;