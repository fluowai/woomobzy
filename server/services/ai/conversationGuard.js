/**
 * Conversation Guard - Pre/Post Generation Validation
 * 
 * Analyzes messages before and after LLM generation to ensure:
 * - No repetition
 * - Required tools are used
 * - No hallucination of operational data
 * - No sensitive data leakage
 * - Context coherence
 * - Handoff triggers evaluated
 * - Rule compliance
 * - Loop detection
 */

import { getSupabaseServer } from '../../lib/supabase-server.js';
import { logger } from '../../utils/logger.js';
import { getConversationStateManager } from './conversationStateManager.js';

// ============================================================
// CONVERSATION GUARD CLASS
// ============================================================

export class ConversationGuard {
  constructor() {
    this.stateManager = getConversationStateManager();
    this.loopDetector = new LoopDetector();
  }

  /**
   * Pre-generation checks
   * Runs before LLM generates response
   */
  async preGenerationCheck(agentVersion, userMessage, conversationState, context = {}) {
    const checks = [];
    const warnings = [];
    const blocks = [];

    // 1. Repetition check - will the agent repeat a question?
    if (userMessage && conversationState) {
      // We can't know exactly what the agent will ask, but we can check
      // if the conversation is in a state where repetition is likely
      const recentQuestions = this.extractRecentAgentQuestions(conversationState);
      if (recentQuestions.length > 0) {
        checks.push({
          type: 'REPETITION_RISK',
          passed: true, // Warning only, actual check post-generation
          details: { recentQuestionsCount: recentQuestions.length }
        });
      }
    }

    // 2. Required tool check - based on intent and missing slots
    const requiredToolCheck = this.checkRequiredTools(conversationState, agentVersion);
    if (!requiredToolCheck.passed) {
      blocks.push({
        type: 'REQUIRED_TOOL_MISSING',
        message: requiredToolCheck.message,
        requiredTools: requiredToolCheck.tools
      });
    }

    // 3. Hallucination risk - check if agent might invent data
    const hallucinationRisk = this.assessHallucinationRisk(conversationState, agentVersion);
    if (hallucinationRisk.level === 'HIGH') {
      warnings.push({
        type: 'HALLUCINATION_RISK',
        level: 'HIGH',
        message: 'High risk of data hallucination. Ensure tools are used for operational data.',
        triggers: hallucinationRisk.triggers
      });
    }

    // 4. Sensitive data check - prevent asking for sensitive info
    const sensitiveCheck = this.checkSensitiveDataRequest(userMessage, conversationState);
    if (!sensitiveCheck.passed) {
      blocks.push({
        type: 'SENSITIVE_DATA_REQUEST',
        message: sensitiveCheck.message,
        fields: sensitiveCheck.fields
      });
    }

    // 5. Context coherence - check if conversation makes sense
    const coherenceCheck = this.checkContextCoherence(conversationState, userMessage);
    if (!coherenceCheck.passed) {
      warnings.push({
        type: 'CONTEXT_INCOHERENCE',
        message: coherenceCheck.message,
        details: coherenceCheck.details
      });
    }

    // 6. Loop detection
    const loopCheck = this.loopDetector.detect(conversationState);
    if (loopCheck.detected) {
      blocks.push({
        type: 'CONVERSATION_LOOP',
        message: `Loop detected: ${loopCheck.pattern}`,
        pattern: loopCheck.pattern,
        iterations: loopCheck.iterations,
        suggestedAction: 'BREAK_LOOP_RECOVER_STATE'
      });
    }

    // 7. Confidence threshold - if intent confidence too low
    if (conversationState.intentConfidence !== undefined && 
        conversationState.intentConfidence < (agentVersion.guardrails?.confidenceThreshold || 0.7)) {
      warnings.push({
        type: 'LOW_CONFIDENCE',
        message: `Intent confidence (${conversationState.intentConfidence}) below threshold`,
        intent: conversationState.intent,
        confidence: conversationState.intentConfidence
      });
    }

    return {
      passed: blocks.length === 0,
      blocks,
      warnings,
      checks,
      recommendedActions: this.getRecommendedActions(blocks, warnings)
    };
  }

  /**
   * Post-generation checks
   * Runs after LLM generates response
   */
  async postGenerationCheck(agentVersion, agentResponse, conversationState, context = {}) {
    const checks = [];
    const violations = [];
    const metrics = {};

    // 1. Repetition detection - did agent repeat a question?
    const repetitionCheck = await this.checkRepetition(agentResponse, conversationState);
    if (!repetitionCheck.passed) {
      violations.push({
        type: 'REPETITION_DETECTED',
        severity: 'HIGH',
        message: repetitionCheck.message,
        repeatedQuestion: repetitionCheck.question,
        existingAnswer: repetitionCheck.existingAnswer
      });
    }

    // 2. Tool usage verification - were required tools called?
    const toolUsageCheck = this.verifyToolUsage(agentResponse, conversationState, context);
    if (!toolUsageCheck.passed) {
      violations.push({
        type: 'REQUIRED_TOOL_NOT_USED',
        severity: 'HIGH',
        message: toolUsageCheck.message,
        missingTools: toolUsageCheck.missingTools
      });
    }

    // 3. Hallucination detection - check for invented operational data
    const hallucinationCheck = await this.detectHallucination(agentResponse, conversationState, context);
    if (!hallucinationCheck.passed) {
      violations.push({
        type: 'HALLUCINATION_DETECTED',
        severity: 'CRITICAL',
        message: hallucinationCheck.message,
        inventedFields: hallucinationCheck.inventedFields,
        evidence: hallucinationCheck.evidence
      });
    }

    // 4. Sensitive data leakage - check response for PII/internal data
    const leakageCheck = this.checkDataLeakage(agentResponse);
    if (!leakageCheck.passed) {
      violations.push({
        type: 'DATA_LEAKAGE',
        severity: 'CRITICAL',
        message: leakageCheck.message,
        leakedFields: leakageCheck.fields
      });
    }

    // 5. Handoff trigger evaluation
    const handoffCheck = this.evaluateHandoffTriggers(agentResponse, conversationState, agentVersion);
    if (handoffCheck.triggered) {
      checks.push({
        type: 'HANDOFF_TRIGGERED',
        passed: true,
        handoff: handoffCheck.handoff
      });
    }

    // 6. Rule compliance - check against agent guardrails
    const complianceCheck = this.checkRuleCompliance(agentResponse, agentVersion, conversationState);
    if (!complianceCheck.passed) {
      violations.push({
        type: 'RULE_VIOLATION',
        severity: complianceCheck.severity,
        message: complianceCheck.message,
        violatedRules: complianceCheck.violatedRules
      });
    }

    // 7. Response quality metrics
    metrics.responseLength = agentResponse.length;
    metrics.questionCount = (agentResponse.match(/\?/g) || []).length;
    metrics.toolCallsInResponse = this.extractToolCallsFromResponse(agentResponse).length;
    metrics.hasHandoff = handoffCheck.triggered;

    return {
      passed: violations.length === 0,
      violations,
      checks,
      metrics,
      recommendedActions: this.getPostRecommendedActions(violations)
    };
  }

  /**
   * Extract recent questions asked by agent
   */
  extractRecentAgentQuestions(conversationState) {
    const questions = [];
    for (const msg of conversationState.messageHistory || []) {
      if (msg.role === 'assistant' && msg.content.includes('?')) {
        questions.push({
          question: msg.content,
          timestamp: msg.timestamp
        });
      }
    }
    return questions.slice(-5); // Last 5 questions
  }

  /**
   * Check if required tools should be used based on missing slots
   */
  checkRequiredTools(conversationState, agentVersion) {
    const missingSlots = Object.entries(conversationState.slots || {})
      .filter(([, slot]) => slot.status === 'missing' || slot.status === 'unknown')
      .map(([key]) => key);

    if (missingSlots.length === 0) return { passed: true };

    // Map slots to required tools
    const slotToolMap = {
      'property_type': 'properties.search',
      'city': 'properties.search',
      'budget_max': 'properties.search',
      'bedrooms': 'properties.search',
      'name': 'crm.leads.create',
      'phone': 'crm.leads.create',
      'email': 'crm.leads.create'
    };

    const requiredTools = [...new Set(missingSlots.map(s => slotToolMap[s]).filter(Boolean))];
    const agentTools = agentVersion.tools || [];

    const missingTools = requiredTools.filter(t => !agentTools.includes(t));
    
    if (missingTools.length > 0) {
      return {
        passed: false,
        message: `Agent missing required tools for missing slots: ${missingTools.join(', ')}`,
        tools: missingTools
      };
    }

    return { passed: true };
  }

  /**
   * Assess hallucination risk based on conversation state
   */
  assessHallucinationRisk(conversationState, agentVersion) {
    const triggers = [];
    let level = 'LOW';

    // High risk if asking about specific operational data without tools
    const missingCriticalSlots = ['budget_max', 'property_type', 'city', 'bedrooms', 'availability']
      .filter(s => (conversationState.slots?.[s]?.status === 'missing' || 
                    conversationState.slots?.[s]?.status === 'unknown'));

    if (missingCriticalSlots.length > 0) {
      triggers.push(`Missing critical slots: ${missingCriticalSlots.join(', ')}`);
      level = 'HIGH';
    }

    // High risk if agent doesn't have property search tool but conversation is about properties
    const hasPropertyTools = (agentVersion.tools || []).some(t => t.startsWith('properties.'));
    const intentPropertyRelated = ['BUY_PROPERTY', 'RENT_PROPERTY', 'BUY_RURAL', 'BUY_DEVELOPMENT', 'BUY_LOT']
      .includes(conversationState.intent);
    
    if (intentPropertyRelated && !hasPropertyTools) {
      triggers.push('Property-related intent but no property tools available');
      level = 'HIGH';
    }

    // High risk if lead memory has data but agent might not use it
    if (Object.keys(conversationState.leadMemory || {}).length > 0) {
      triggers.push('Lead memory has data - ensure agent uses it');
      level = level === 'HIGH' ? 'HIGH' : 'MEDIUM';
    }

    return { level, triggers };
  }

  /**
   * Check if user message requests sensitive data
   */
  checkSensitiveDataRequest(userMessage, conversationState) {
    if (!userMessage) return { passed: true };
    
    const sensitivePatterns = [
      { pattern: /cpf|cnpj|documento|identidade/gi, field: 'CPF/CNPJ' },
      { pattern: /senha|password|credencial/gi, field: 'Senha/Credencial' },
      { pattern: /banco|agência|conta|pix|cartão/gi, field: 'Dados bancários' },
      { pattern: /endereço completo|rua|número|cep/gi, field: 'Endereço completo' }
    ];

    for (const { pattern, field } of sensitivePatterns) {
      if (pattern.test(userMessage)) {
        return {
          passed: false,
          message: `Solicitação de dado sensível detectado: ${field}`,
          fields: [field]
        };
      }
    }

    return { passed: true };
  }

  /**
   * Check context coherence
   */
  checkContextCoherence(conversationState, userMessage) {
    if (!userMessage || conversationState.messageHistory.length < 2) {
      return { passed: true };
    }

    // Check for sudden topic changes without handoff
    const recentIntents = conversationState.messageHistory
      .slice(-4)
      .filter(m => m.metadata?.intent)
      .map(m => m.metadata.intent);

    if (recentIntents.length >= 2) {
      const uniqueIntents = [...new Set(recentIntents)];
      if (uniqueIntents.length > 1 && !conversationState.context?.handoffOccurred) {
        return {
          passed: false,
          message: `Mudança de intenção detectada sem handoff: ${uniqueIntents.join(' → ')}`,
          details: { intents: uniqueIntents }
        };
      }
    }

    return { passed: true };
  }

  /**
   * Check if agent repeated a question in response
   */
  async checkRepetition(agentResponse, conversationState) {
    const questions = this.extractQuestions(agentResponse);
    
    for (const question of questions) {
      const canAsk = await this.stateManager.deduplicationEngine.canAsk(question, conversationState);
      if (!canAsk.canAsk) {
        return {
          passed: false,
          message: `Pergunta repetida detectada: "${question}"`,
          question,
          existingAnswer: canAsk.existingAnswer,
          reason: canAsk.reason
        };
      }
    }

    return { passed: true };
  }

  /**
   * Extract questions from text
   */
  extractQuestions(text) {
    const questions = [];
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.endsWith('?') || trimmed.match(/^(qual|quais|quanto|quantos|onde|quando|como|por que|você|tem|há|existe)/i)) {
        questions.push(trimmed + (trimmed.endsWith('?') ? '' : '?'));
      }
    }
    
    return questions;
  }

  /**
   * Verify required tools were used
   */
  verifyToolUsage(agentResponse, conversationState, context) {
    // Check if tool calls were made in this turn
    const toolCalls = context.toolCalls || [];
    const executedTools = toolCalls.map(t => t.name);
    
    // Determine what tools should have been used based on response content
    const responseLower = agentResponse.toLowerCase();
    const shouldHaveUsed = [];
    
    // If response mentions specific property data, search should have been used
    if (/r\$\s*\d|valor|preço|disponível|encontrei|opções|imóveis?/i.test(responseLower)) {
      shouldHaveUsed.push('properties.search');
    }
    
    // If response mentions scheduling, calendar should have been used
    if (/agend|visit|horário|dia|hora|marcad/i.test(responseLower)) {
      shouldHaveUsed.push('calendar.create');
    }
    
    // If response mentions lead update, CRM should have been used
    if (/atualiz|registr|salv|anot/i.test(responseLower)) {
      shouldHaveUsed.push('crm.leads.update');
    }
    
    const missingTools = shouldHaveUsed.filter(t => !executedTools.includes(t));
    
    if (missingTools.length > 0) {
      return {
        passed: false,
        message: `Resposta sugere uso de tools não executadas: ${missingTools.join(', ')}`,
        missingTools
      };
    }
    
    return { passed: true };
  }

  /**
   * Detect hallucination of operational data
   */
  async detectHallucination(agentResponse, conversationState, context) {
    const inventedFields = [];
    const evidence = [];
    const responseLower = agentResponse.toLowerCase();
    
    // Check for specific price mentions without tool result
    const priceMatches = agentResponse.match(/r\$\s*[\d.,]+/gi);
    if (priceMatches) {
      const hasPropertyToolResult = (context.toolCalls || []).some(t => t.name === 'properties.search');
      const hasPropertyInContext = (conversationState.context?.toolResults || [])
        .some(r => r.tool === 'properties.search' && r.result?.results?.length > 0);
      
      if (!hasPropertyToolResult && !hasPropertyInContext) {
        inventedFields.push('price');
        evidence.push({ type: 'PRICE_WITHOUT_TOOL', values: priceMatches });
      }
    }
    
    // Check for specific availability claims
    if (/disponível|disponibilidade|tem vaga|tem unidade|em estoque/i.test(responseLower)) {
      const hasAvailabilityTool = (context.toolCalls || []).some(t => t.name === 'properties.availability');
      const hasSearchResult = (conversationState.context?.toolResults || [])
        .some(r => r.tool === 'properties.search' && r.result?.results?.length > 0);
      
      if (!hasAvailabilityTool && !hasSearchResult) {
        inventedFields.push('availability');
        evidence.push({ type: 'AVAILABILITY_WITHOUT_TOOL' });
      }
    }
    
    // Check for specific address/location details
    if (/rua|avenida|endereço|bairro|número|cep/i.test(responseLower)) {
      const hasPropertyRead = (context.toolCalls || []).some(t => t.name === 'properties.read');
      if (!hasPropertyRead) {
        inventedFields.push('address');
        evidence.push({ type: 'ADDRESS_WITHOUT_TOOL' });
      }
    }
    
    // Check for financing details
    if (/parcela|financiamento|entrada|juros|prazo.*meses/i.test(responseLower)) {
      const hasFinancingTool = (context.toolCalls || []).some(t => t.name === 'financing.simulate');
      if (!hasFinancingTool) {
        inventedFields.push('financing_details');
        evidence.push({ type: 'FINANCING_WITHOUT_TOOL' });
      }
    }
    
    // Check for lead/CRM data
    if (/lead|cliente|cadastro|sistema|crm/i.test(responseLower)) {
      const hasCrmTool = (context.toolCalls || []).some(t => t.name.startsWith('crm.'));
      if (!hasCrmTool && Object.keys(conversationState.leadMemory || {}).length === 0) {
        inventedFields.push('crm_data');
        evidence.push({ type: 'CRM_DATA_WITHOUT_TOOL' });
      }
    }

    if (inventedFields.length > 0) {
      return {
        passed: false,
        message: `Dados operacionais inventados detectados: ${inventedFields.join(', ')}`,
        inventedFields,
        evidence
      };
    }

    return { passed: true };
  }

  /**
   * Check for data leakage in response
   */
  checkDataLeakage(agentResponse) {
    const leakedFields = [];
    const responseLower = agentResponse.toLowerCase();
    
    // Check for internal system references
    const internalPatterns = [
      { pattern: /system prompt|instruções do sistema|prompt do agente/gi, field: 'System Prompt' },
      { pattern: /api[_-]?key|secret|token|credencial/gi, field: 'API Key/Secret' },
      { pattern: /organization_id|tenant_id|org_id/gi, field: 'Tenant ID' },
      { pattern: /function calling|function_declaration|tool_call/gi, field: 'Technical Implementation' },
      { pattern: /temperature|max_tokens|top_p|model:/gi, field: 'Model Config' },
      { pattern: /outro tenant|outra imobiliária|outro cliente/gi, field: 'Other Tenant Data' }
    ];
    
    for (const { pattern, field } of internalPatterns) {
      if (pattern.test(responseLower)) {
        leakedFields.push(field);
      }
    }
    
    if (leakedFields.length > 0) {
      return {
        passed: false,
        message: `Vazamento de dados internos/sensíveis: ${leakedFields.join(', ')}`,
        fields: leakedFields
      };
    }
    
    return { passed: true };
  }

  /**
   * Evaluate handoff triggers
   */
  evaluateHandoffTriggers(agentResponse, conversationState, agentVersion) {
    const handoffs = agentVersion.handoffs || [];
    const responseLower = agentResponse.toLowerCase();
    
    for (const handoff of handoffs) {
      const { trigger, conditions = {} } = handoff;
      
      let triggered = false;
      
      switch (trigger) {
        case 'USER_REQUEST':
          if (/humano|corretor|pessoa real|atendente|falar com alguém/i.test(responseLower)) {
            triggered = true;
          }
          break;
          
        case 'SCORE_THRESHOLD':
          const minScore = conditions.minScore || 70;
          if (conversationState.leadMemory?.lead_score >= minScore) {
            triggered = true;
          }
          break;
          
        case 'NEGOTIATION':
          if (/negoci|proposta|desconto|valor.*baixo|caro/i.test(responseLower)) {
            triggered = true;
          }
          break;
          
        case 'LOW_CONFIDENCE':
          if (conversationState.intentConfidence < (conditions.threshold || 0.5)) {
            triggered = true;
          }
          break;
          
        case 'LEGAL_ISSUE':
          if (/jurídico|advogado|contrato|cláusula|risco|problema legal/i.test(responseLower)) {
            triggered = true;
          }
          break;
      }
      
      if (triggered) {
        return {
          triggered: true,
          handoff: {
            fromAgent: agentVersion.id,
            toAgent: handoff.toAgentRole,
            reason: trigger,
            summary: handoff.summaryTemplate || `Handoff triggered by ${trigger}`,
            preserveContext: handoff.preserveContext !== false
          }
        };
      }
    }
    
    return { triggered: false };
  }

  /**
   * Check rule compliance
   */
  checkRuleCompliance(agentResponse, agentVersion, conversationState) {
    const guardrails = agentVersion.guardrails || {};
    const violatedRules = [];
    
    // Check max consecutive questions
    const questions = this.extractQuestions(agentResponse);
    const maxQuestions = guardrails.maxConsecutiveQuestions || 3;
    
    if (questions.length > maxQuestions) {
      violatedRules.push({
        rule: 'MAX_CONSECUTIVE_QUESTIONS',
        limit: maxQuestions,
        actual: questions.length
      });
    }
    
    // Check prohibited topics
    const prohibited = guardrails.prohibitedTopics || [];
    const responseLower = agentResponse.toLowerCase();
    
    for (const topic of prohibited) {
      if (responseLower.includes(topic.toLowerCase())) {
        violatedRules.push({
          rule: 'PROHIBITED_TOPIC',
          topic
        });
      }
    }
    
    // Check required tool usage for specific topics
    const requireToolFor = guardrails.requireToolFor || [];
    for (const topic of requireToolFor) {
      if (responseLower.includes(topic.toLowerCase())) {
        // Would need to check if tool was actually called - simplified here
        violatedRules.push({
          rule: 'REQUIRE_TOOL_FOR_TOPIC',
          topic,
          note: 'Verify tool was called in context'
        });
      }
    }
    
    if (violatedRules.length > 0) {
      return {
        passed: false,
        severity: 'HIGH',
        message: `Violação de ${violatedRules.length} regra(s) de guardrail`,
        violatedRules
      };
    }
    
    return { passed: true };
  }

  /**
   * Extract tool calls from response (for responses that include them)
   */
  extractToolCallsFromResponse(response) {
    // This would parse tool calls from structured response
    // For now, return empty - actual tool calls come from context
    return [];
  }

  /**
   * Get recommended actions for pre-generation issues
   */
  getRecommendedActions(blocks, warnings) {
    const actions = [];
    
    for (const block of blocks) {
      switch (block.type) {
        case 'REQUIRED_TOOL_MISSING':
          actions.push({ action: 'ADD_TOOLS_TO_AGENT', tools: block.requiredTools });
          break;
        case 'SENSITIVE_DATA_REQUEST':
          actions.push({ action: 'REFUSE_AND_REDIRECT', message: 'Não posso solicitar esse tipo de informação.' });
          break;
        case 'CONVERSATION_LOOP':
          actions.push({ action: 'BREAK_LOOP', message: 'Vou reformular minha pergunta.' });
          break;
      }
    }
    
    for (const warning of warnings) {
      switch (warning.type) {
        case 'HALLUCINATION_RISK':
          actions.push({ action: 'ENFORCE_TOOL_USAGE', message: 'Use ferramentas para dados operacionais.' });
          break;
        case 'LOW_CONFIDENCE':
          actions.push({ action: 'ASK_CLARIFICATION', message: 'Preciso entender melhor sua necessidade.' });
          break;
      }
    }
    
    return actions;
  }

  /**
   * Get recommended actions for post-generation violations
   */
  getPostRecommendedActions(violations) {
    const actions = [];
    
    for (const violation of violations) {
      switch (violation.type) {
        case 'REPETITION_DETECTED':
          actions.push({ 
            action: 'REGENERATE_RESPONSE', 
            reason: 'Remove repeated question',
            guidance: 'Use information already in slots/CRM/tools instead of asking again.'
          });
          break;
        case 'REQUIRED_TOOL_NOT_USED':
          actions.push({ 
            action: 'REGENERATE_WITH_TOOLS', 
            reason: 'Required tools not used',
            missingTools: violation.missingTools
          });
          break;
        case 'HALLUCINATION_DETECTED':
          actions.push({ 
            action: 'REGENERATE_WITH_TOOLS', 
            reason: 'Hallucinated operational data',
            inventedFields: violation.inventedFields
          });
          break;
        case 'DATA_LEAKAGE':
          actions.push({ 
            action: 'REGENERATE_SANITIZED', 
            reason: 'Internal data leaked',
            leakedFields: violation.leakedFields
          });
          break;
        case 'RULE_VIOLATION':
          actions.push({ 
            action: 'REGENERATE_COMPLIANT', 
            reason: 'Guardrail violation',
            violatedRules: violation.violatedRules
          });
          break;
      }
    }
    
    return actions;
  }
}

// ============================================================
// LOOP DETECTOR
// ============================================================

class LoopDetector {
  constructor() {
    this.MAX_HISTORY = 20;
    this.SIMILARITY_THRESHOLD = 0.8;
  }

  detect(conversationState) {
    const history = conversationState.messageHistory || [];
    if (history.length < 6) return { detected: false }; // Need at least 3 Q&A pairs
    
    // Look at last 6 messages (3 pairs)
    const recent = history.slice(-6);
    const agentMessages = recent.filter(m => m.role === 'assistant');
    const userMessages = recent.filter(m => m.role === 'user');
    
    if (agentMessages.length < 3) return { detected: false };
    
    // Check for repeated question patterns
    const agentQuestions = agentMessages
      .map(m => this.extractQuestions(m.content))
      .flat()
      .map(q => q.toLowerCase().trim());
    
    // Check for exact repetition
    const questionCounts = {};
    for (const q of agentQuestions) {
      questionCounts[q] = (questionCounts[q] || 0) + 1;
    }
    
    for (const [question, count] of Object.entries(questionCounts)) {
      if (count >= 2) {
        return {
          detected: true,
          pattern: 'EXACT_QUESTION_REPEAT',
          question,
          iterations: count,
          suggestedAction: 'BREAK_LOOP_RECOVER_STATE'
        };
      }
    }
    
    // Check for semantic repetition (similar questions)
    for (let i = 0; i < agentQuestions.length; i++) {
      for (let j = i + 1; j < agentQuestions.length; j++) {
        const sim = this.similarity(agentQuestions[i], agentQuestions[j]);
        if (sim >= this.SIMILARITY_THRESHOLD) {
          return {
            detected: true,
            pattern: 'SEMANTIC_QUESTION_REPEAT',
            question1: agentQuestions[i],
            question2: agentQuestions[j],
            similarity: sim,
            suggestedAction: 'BREAK_LOOP_RECOVER_STATE'
          };
        }
      }
    }
    
    // Check for answer repetition (user giving same answer)
    const userAnswers = userMessages.map(m => m.content.toLowerCase().trim());
    const answerCounts = {};
    for (const a of userAnswers) {
      answerCounts[a] = (answerCounts[a] || 0) + 1;
    }
    
    for (const [answer, count] of Object.entries(answerCounts)) {
      if (count >= 2 && answer.length > 3) {
        return {
          detected: true,
          pattern: 'USER_REPEAT_ANSWER',
          answer,
          iterations: count,
          suggestedAction: 'ACKNOWLEDGE_AND_MOVE_ON'
        };
      }
    }
    
    return { detected: false };
  }

  extractQuestions(text) {
    const questions = [];
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.endsWith('?') || trimmed.match(/^(qual|quais|quanto|quantos|onde|quando|como|por que)/i)) {
        questions.push(trimmed + (trimmed.endsWith('?') ? '' : '?'));
      }
    }
    return questions;
  }

  similarity(a, b) {
    const wordsA = new Set(a.split(' ').filter(w => w.length > 2));
    const wordsB = new Set(b.split(' ').filter(w => w.length > 2));
    const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
  }
}

export default ConversationGuard;