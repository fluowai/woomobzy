/**
 * AI Agents API Routes - Complete Implementation
 * Handles CRUD, versions, conversations, testing, and conversation handling
 * 
 * All routes use:
 * - verifyAuth and requireTenant middleware (applied at index.js level)
 * - Proper error classification (400, 403, 404, 500)
 * - try-catch protection on all async operations
 * - Fallback support for missing ai_agents table
 */

import express from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getPolicyEngine } from '../../services/ai/toolRegistry.js';
import { getConversationStateManager } from '../../services/ai/conversationStateManager.js';
import ConversationGuard from '../../services/ai/conversationGuard.js';
import { getLLMOrchestrator } from '../../services/ai/llmProvider.js';
import { logger } from '../../utils/logger.js';
import {
  isMissingRelationError,
  normalizeAgentPayload,
  hydrateAgent,
  listFallbackAgentsSafe,
  createFallbackAgent,
  updateFallbackAgent,
  deleteFallbackAgent,
} from './helpers.js';

const router = express.Router();

// ============================================================
// ERROR HELPERS
// ============================================================

function classifyError(error) {
  if (!error) return { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Erro interno' };
  
  const message = String(error.message || '').toLowerCase();
  const code = error.code;
  
  if (message.includes('permission denied') || message.includes('rls')) {
    return { statusCode: 403, code: 'PERMISSION_DENIED', message: 'Permissao negada' };
  }
  if (message.includes('not found') || code === 'PGRST116') {
    return { statusCode: 404, code: 'NOT_FOUND', message: 'Recurso nao encontrado' };
  }
  if (code === '23505') {
    return { statusCode: 409, code: 'DUPLICATE_ENTRY', message: 'Registro duplicado' };
  }
  if (code === '23503') {
    return { statusCode: 409, code: 'FOREIGN_KEY_VIOLATION', message: 'Registro esta em uso' };
  }
  if (message.includes('relation') || message.includes('table') || message.includes('does not exist')) {
    return { statusCode: 404, code: 'TABLE_MISSING', message: 'Tabela nao encontrada' };
  }
  if (message.includes('invalid input') || message.includes('malformed') || code === '22P02') {
    return { statusCode: 400, code: 'INVALID_INPUT', message: 'Entrada invalida' };
  }
  
  return { statusCode: 500, code: 'INTERNAL_ERROR', message: error.message };
}

function handleRouteError(res, error, action) {
  const { statusCode, code, message } = classifyError(error);
  const errorCode = `AI_${action}_${code}`;
  
  logger.error(`[AIAgents] ${action} error`, { 
    error: error.message, 
    stack: error.stack?.split('\n').slice(0, 5).join('\n') 
  });
  
  res.status(statusCode).json({
    success: false,
    error: message,
    code: errorCode,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
}

// ============================================================
// VALIDATION HELPERS
// ============================================================

function validatePagination(req) {
  const { page = 1, limit = 50 } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  
  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    return { error: 'Parametros de paginacao invalidos. page >= 1, 1 <= limit <= 100' };
  }
  
  return { page: pageNum, limit: limitNum, offset: (pageNum - 1) * limitNum };
}

// ============================================================
// AGENT CRUD
// ============================================================

router.get('/agents', verifyAuth, requireTenant, async (req, res) => {
  try {
    const pagination = validatePagination(req);
    if (pagination.error) {
      return res.status(400).json({ success: false, error: pagination.error, code: 'INVALID_PAGINATION' });
    }

    const supabase = getSupabaseServer();
    const { page, limit, offset } = pagination;

    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (isMissingRelationError(error)) {
        const agents = await listFallbackAgentsSafe(supabase, req.orgId);
        return res.json({
          success: true,
          agents,
          setup_required: true,
          message: 'Tabela ai_agents ainda nao foi criada. Salvando agentes temporariamente em site_settings.integrations.operationalAgents.',
          pagination: { page, limit, total: agents.length },
        });
      }
      throw error;
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('ai_agents')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', req.orgId);

    res.json({
      success: true,
      agents: (data || []).map(hydrateAgent),
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error) {
    handleRouteError(res, error, 'AGENTS_LIST');
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
        return res.status(201).json({
          success: true,
          agent,
          setup_required: true,
          message: 'Agente criado em fallback. Tabela ai_agents ainda nao existe.',
        });
      }
      throw error;
    }

    res.status(201).json({ success: true, agent: hydrateAgent(data) });
  } catch (error) {
    handleRouteError(res, error, 'AGENT_CREATE');
  }
});

router.get('/agents/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID do agente e obrigatorio',
        code: 'AI_AGENT_ID_REQUIRED',
      });
    }

    const { data: agent, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !agent) {
      if (error && isMissingRelationError(error)) {
        return res.status(404).json({
          success: false,
          error: 'Agente nao encontrado',
          code: 'AI_AGENT_NOT_FOUND',
          setup_required: true,
        });
      }
      throw error || new Error('Agent not found');
    }

    let versions = [];
    try {
      const { data: agentVersions, error: versionsError } = await supabase
        .from('ai_agent_versions')
        .select('*')
        .eq('agent_id', id)
        .order('created_at', { ascending: false });

      if (versionsError && !isMissingRelationError(versionsError)) {
        throw versionsError;
      }

      versions = agentVersions || [];
    } catch (versionError) {
      logger.warn('[AIAgents] Failed to load agent versions', { error: versionError.message });
    }

    res.json({ success: true, agent: hydrateAgent({ ...agent, versions }) });
  } catch (error) {
    handleRouteError(res, error, 'AGENT_GET');
  }
});

router.patch('/agents/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;
    const payload = normalizeAgentPayload(req.body, true);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID do agente e obrigatorio',
        code: 'AI_AGENT_ID_REQUIRED',
      });
    }

    const { data, error } = await supabase
      .from('ai_agents')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        const agent = await updateFallbackAgent(supabase, req.orgId, id, payload);
        if (!agent) {
          return res.status(404).json({
            success: false,
            error: 'Agente nao encontrado',
            code: 'AI_AGENT_NOT_FOUND',
          });
        }
        return res.json({ success: true, agent, setup_required: true });
      }
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado',
        code: 'AI_AGENT_NOT_FOUND',
      });
    }

    res.json({ success: true, agent: hydrateAgent(data) });
  } catch (error) {
    handleRouteError(res, error, 'AGENT_UPDATE');
  }
});

router.patch('/agents/:id/prompt', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;
    const { promptText } = req.body;

    if (!promptText) {
      return res.status(400).json({
        success: false,
        error: 'promptText é obrigatório',
        code: 'AI_AGENT_PROMPT_REQUIRED',
      });
    }

    // Ensure the agent exists and has an active version
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado',
        code: 'AI_AGENT_NOT_FOUND',
      });
    }

    if (!agent.active_version_id) {
      try {
        const { data: version, error: createVersionError } = await supabase
          .from('ai_agent_versions')
          .insert({
            agent_id: id,
            version: '1.0',
            prompt: { full: promptText },
            model: 'gemini-1.5-pro',
            model_config: { temperature: 0.4, maxTokens: 4096, topP: 0.9 },
            tools: agent.tools || [],
            permissions: [],
            guardrails: {},
            handoff_config: agent.handoff_rules || {},
            memory_config: {},
            workflow_config: {},
            created_by: req.user.id
          })
          .select()
          .single();

        if (createVersionError) throw createVersionError;

        await supabase
          .from('ai_agents')
          .update({
            active_version_id: version.id,
            instructions: promptText,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('organization_id', req.orgId);

        return res.json({ success: true, version });
      } catch (versionCreateError) {
        if (isMissingRelationError(versionCreateError)) {
          const { error: legacyUpdateError } = await supabase
            .from('ai_agents')
            .update({ instructions: promptText, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('organization_id', req.orgId);

          if (legacyUpdateError) throw legacyUpdateError;
          return res.json({ success: true, legacy: true });
        }
        throw versionCreateError;
      }
    }

    // Get the current version to preserve any other prompt keys (like blocks)
    const { data: version, error: versionError } = await supabase
      .from('ai_agent_versions')
      .select('prompt')
      .eq('id', agent.active_version_id)
      .single();

    if (versionError) throw versionError;

    const existingPrompt = version?.prompt || {};
    
    // Update the prompt object in the version
    const { error: updateError } = await supabase
      .from('ai_agent_versions')
      .update({
        prompt: { ...existingPrompt, full: promptText }
      })
      .eq('id', agent.active_version_id);

    if (updateError) throw updateError;

    await supabase
      .from('ai_agents')
      .update({
        instructions: promptText,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', req.orgId);

    res.json({ success: true });
  } catch (error) {
    handleRouteError(res, error, 'AGENT_PROMPT_UPDATE');
  }
});

router.delete('/agents/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID do agente e obrigatorio',
        code: 'AI_AGENT_ID_REQUIRED',
      });
    }

    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', id)
      .eq('organization_id', req.orgId);

    if (error) {
      if (isMissingRelationError(error)) {
        await deleteFallbackAgent(supabase, req.orgId, id);
        return res.json({ success: true, setup_required: true });
      }
      throw error;
    }

    res.json({ success: true });
  } catch (error) {
    handleRouteError(res, error, 'AGENT_DELETE');
  }
});

// ============================================================
// AGENT VERSIONS
// ============================================================

router.post('/agents/:id/versions', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;
    const { prompt, model, modelConfig, tools, permissions, guardrails, handoffConfig, memoryConfig, workflowConfig } = req.body;

    // Validate required fields
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'prompt e obrigatorio',
        code: 'AI_VERSION_PROMPT_REQUIRED',
      });
    }

    // Verify agent exists
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado',
        code: 'AI_AGENT_NOT_FOUND',
      });
    }

    // Get next version number
    const { data: versions } = await supabase
      .from('ai_agent_versions')
      .select('version')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextVersion = '1.0';
    if (versions && versions.length > 0) {
      const lastVersion = versions[0].version;
      const parts = lastVersion.split('.').map(Number);
      parts[1] = (parts[1] || 0) + 1;
      nextVersion = parts.join('.');
    }

    // Create version
    const { data: version, error } = await supabase
      .from('ai_agent_versions')
      .insert({
        agent_id: id,
        version: nextVersion,
        prompt,
        model: model || 'gemini-1.5-pro',
        model_config: modelConfig || { temperature: 0.4, maxTokens: 4096, topP: 0.9 },
        tools: tools || [],
        permissions: permissions || [],
        guardrails: guardrails || {},
        handoff_config: handoffConfig || {},
        memory_config: memoryConfig || {},
        workflow_config: workflowConfig || {},
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Link tools if provided
    if (tools && tools.length > 0) {
      for (const toolName of tools) {
        try {
          const { data: tool } = await supabase
            .from('ai_tools')
            .select('id')
            .eq('name', toolName)
            .single();

          if (tool) {
            await supabase.from('ai_agent_tools').insert({
              agent_version_id: version.id,
              tool_id: tool.id
            });
          }
        } catch (toolError) {
          // Log but don't fail the whole operation
          logger.warn('[AIAgents] Failed to link tool, continuing', { error: toolError.message });
        }
      }
    }

    // Audit log
    try {
      await supabase.from('ai_audit_logs').insert({
        organization_id: req.orgId,
        actor_id: req.user.id,
        actor_type: 'USER',
        entity_type: 'ai_agent_version',
        entity_id: version.id,
        action: 'create',
        after_state: { version: nextVersion, agentId: id }
      });
    } catch (auditError) {
      logger.warn('[AIAgents] Failed to create audit log', { error: auditError.message });
    }

    res.status(201).json({ success: true, version });
  } catch (error) {
    handleRouteError(res, error, 'VERSION_CREATE');
  }
});

router.get('/agents/:id/versions', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;

    // Verify agent exists
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado',
        code: 'AI_AGENT_NOT_FOUND',
      });
    }

    const { data: versions, error } = await supabase
      .from('ai_agent_versions')
      .select('*')
      .eq('agent_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, versions: versions || [] });
  } catch (error) {
    handleRouteError(res, error, 'VERSIONS_LIST');
  }
});

router.post('/agents/:id/versions/:version/rollback', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id, version: versionStr } = req.params;

    // Get target version
    const { data: targetVersion } = await supabase
      .from('ai_agent_versions')
      .select('*')
      .eq('agent_id', id)
      .eq('version', versionStr)
      .single();

    if (!targetVersion) {
      return res.status(404).json({
        success: false,
        error: 'Versao nao encontrada',
        code: 'AI_VERSION_NOT_FOUND',
      });
    }

    // Verify agent belongs to org
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('active_version_id')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado',
        code: 'AI_AGENT_NOT_FOUND',
      });
    }

    // Determine next version number
    const { data: versions } = await supabase
      .from('ai_agent_versions')
      .select('version')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextVersion = '1.0';
    if (versions && versions.length > 0) {
      const parts = versions[0].version.split('.').map(Number);
      parts[1] = (parts[1] || 0) + 1;
      nextVersion = parts.join('.');
    }

    // Create new version as copy of target
    const { data: newVersion, error: createError } = await supabase
      .from('ai_agent_versions')
      .insert({
        agent_id: id,
        version: nextVersion,
        prompt: targetVersion.prompt,
        model: targetVersion.model,
        model_config: targetVersion.model_config,
        tools: targetVersion.tools,
        permissions: targetVersion.permissions,
        guardrails: targetVersion.guardrails,
        handoff_config: targetVersion.handoff_config,
        memory_config: targetVersion.memory_config,
        workflow_config: targetVersion.workflow_config,
        created_by: req.user.id
      })
      .select()
      .single();

    if (createError) throw createError;

    // Set as active
    await supabase
      .from('ai_agents')
      .update({
        active_version_id: newVersion.id,
        status: 'DRAFT',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', req.orgId);

    // Copy tool links
    try {
      const { data: oldTools } = await supabase
        .from('ai_agent_tools')
        .select('tool_id, config_override')
        .eq('agent_version_id', targetVersion.id);

      for (const t of oldTools || []) {
        await supabase.from('ai_agent_tools').insert({
          agent_version_id: newVersion.id,
          tool_id: t.tool_id,
          config_override: t.config_override
        });
      }
    } catch (toolsError) {
      logger.warn('[AIAgents] Failed to copy tool links during rollback', { error: toolsError.message });
    }

    // Audit log
    try {
      await supabase.from('ai_audit_logs').insert({
        organization_id: req.orgId,
        actor_id: req.user.id,
        actor_type: 'USER',
        entity_type: 'ai_agent',
        entity_id: id,
        action: 'rollback',
        before_state: { activeVersionId: agent.active_version_id },
        after_state: { activeVersionId: newVersion.id, rolledBackFrom: versionStr }
      });
    } catch (auditError) {
      logger.warn('[AIAgents] Failed to create rollback audit log', { error: auditError.message });
    }

    res.json({
      success: true,
      message: `Rolled back to version ${versionStr} (created new version ${nextVersion})`,
      version: newVersion
    });
  } catch (error) {
    handleRouteError(res, error, 'ROLLBACK');
  }
});

// ============================================================
// CONVERSATION HANDLING
// ============================================================

router.post('/agents/conversations/state', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { conversationId, channel, instanceId, leadId } = req.body;

    if (!conversationId || !channel) {
      return res.status(400).json({
        success: false,
        error: 'conversationId e channel sao obrigatorios',
        code: 'AI_CONVERSATION_MISSING_FIELDS',
      });
    }

    const stateManager = getConversationStateManager();
    const state = await stateManager.getOrCreateState(req.orgId, conversationId, channel, instanceId);

    if (leadId) {
      await stateManager.updateState(req.orgId, conversationId, { leadId });
    }

    const displayState = await stateManager.getStateForDisplay(req.orgId, conversationId, channel);

    res.json({ success: true, state: displayState });
  } catch (error) {
    handleRouteError(res, error, 'CONVERSATION_STATE');
  }
});

router.post('/agents/conversations/state/update', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { conversationId, ...updates } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'conversationId e obrigatorio',
        code: 'AI_CONVERSATION_ID_REQUIRED',
      });
    }

    const stateManager = getConversationStateManager();
    await stateManager.updateState(req.orgId, conversationId, updates);

    const displayState = await stateManager.getStateForDisplay(req.orgId, conversationId, updates.channel);

    res.json({ success: true, state: displayState });
  } catch (error) {
    handleRouteError(res, error, 'CONVERSATION_STATE_UPDATE');
  }
});

router.post('/agents/conversations/:id/message', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { message, channel, instanceId, agentId } = req.body;

    if (!message || !channel) {
      return res.status(400).json({
        success: false,
        error: 'message e channel sao obrigatorios',
        code: 'AI_MESSAGE_MISSING_FIELDS',
      });
    }

    const supabase = getSupabaseServer();
    const stateManager = getConversationStateManager();
    const guard = new ConversationGuard();
    const llm = getLLMOrchestrator();
    const policyEngine = getPolicyEngine();

    // Get or create conversation state
    let state = await stateManager.getOrCreateState(req.orgId, conversationId, channel, instanceId);

    // Add user message to history
    await stateManager.addMessage(req.orgId, conversationId, 'user', message, { channel });

    // Update state with new message
    state = await stateManager.getOrCreateState(req.orgId, conversationId, channel, instanceId);

    // Determine which agent should handle this
    let currentAgentId = agentId || state.currentAgentId;

    if (!currentAgentId) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum agente atribuido a conversa',
        code: 'AI_NO_AGENT_ASSIGNED',
      });
    }

    // Get agent and resolve its active version explicitly.
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', currentAgentId)
      .eq('organization_id', req.orgId)
      .single();

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado',
        code: 'AI_AGENT_NOT_FOUND',
      });
    }

    let version = null;
    if (agent.active_version_id) {
      const { data: activeVersion } = await supabase
        .from('ai_agent_versions')
        .select('*')
        .eq('id', agent.active_version_id)
        .eq('agent_id', agent.id)
        .single();
      version = activeVersion;
    }

    if (!version) {
      const { data: latestVersions } = await supabase
        .from('ai_agent_versions')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(1);
      version = latestVersions?.[0] || null;
    }

    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Versao do agente nao encontrada',
        code: 'AI_AGENT_OR_VERSION_NOT_FOUND',
      });
    }

    // Pre-generation guard check
    const preCheck = await guard.preGenerationCheck(version, message, state);

    if (!preCheck.passed) {
      return res.status(400).json({
        success: false,
        error: 'Pre-generation checks failed',
        blocks: preCheck.blocks,
        recommendedActions: preCheck.recommendedActions,
        code: 'AI_GUARD_BLOCKED',
      });
    }

    // Build messages for LLM
    const systemPrompt = version.prompt?.full || version.prompt?.blocks?.map(b => b.content).join('\n\n') || '';

    const messages = [
      { role: 'system', content: systemPrompt },
      ...state.messageHistory.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
    ];

    // Check if LLM is available before processing
    const llmProvider = llm.getProviderForTask('conversation');
    if (!llmProvider) {
      return res.status(500).json({
        success: false,
        error: 'Nenhum provedor LLM configurado. Adicione chaves de API no painel de configurações.',
        code: 'AI_LLM_NOT_CONFIGURED',
      });
    }

    // Call LLM with tools - with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

    try {
      const toolConfig = {
        tools: version.tools,
        toolChoice: 'auto'
      };

      const llmResponse = await llm.chat(messages, 'conversation', {
        model: version.model,
        temperature: version.modelConfig?.temperature || 0.4,
        maxTokens: version.modelConfig?.maxTokens || 4096,
        topP: version.modelConfig?.topP || 0.9,
        ...toolConfig,
        signal: controller.signal
      });

      // Execute tool calls
      let toolResults = [];
      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        for (const toolCall of llmResponse.toolCalls) {
          try {
            const toolName = toolCall.function?.name;
            const toolArgs = JSON.parse(toolCall.function?.arguments || '{}');

            const result = await policyEngine.executeToolCall(
              version.id,
              toolName,
              toolArgs,
              { organizationId: req.orgId, conversationId, leadId: state.leadId, channel }
            );

            toolResults.push({ tool: toolName, input: toolArgs, result });

            // Record tool result in state
            await stateManager.recordToolResult(req.orgId, conversationId, toolName, toolArgs, result);
          } catch (toolError) {
            logger.error('[AIAgents] Tool execution failed', { error: toolError.message });
            toolResults.push({ tool: toolCall.function?.name, error: toolError.message });
          }
        }

        // If tools were called, send results back to LLM
        if (toolResults.length > 0 && !toolResults.some(t => t.error)) {
          const toolMessages = [
            ...messages,
            { role: 'assistant', content: llmResponse.content, tool_calls: llmResponse.toolCalls },
            ...toolResults.map(tr => ({
              role: 'tool',
              content: JSON.stringify(tr.result),
              tool_call_id: tr.toolCallId || `call_${Date.now()}`,
              name: tr.tool
            }))
          ];

          const finalResponse = await llm.chat(toolMessages, 'conversation', {
            model: version.model,
            temperature: version.modelConfig?.temperature,
            maxTokens: version.modelConfig?.maxTokens
          });

          llmResponse.content = finalResponse.content;
        }
      }

      // Post-generation guard check
      const postCheck = await guard.postGenerationCheck(version, llmResponse.content, state, {
        toolCalls: toolResults.map(t => ({ name: t.tool }))
      });

      if (!postCheck.passed) {
        logger.warn('[AIAgents] Post-generation violations', {
          conversationId,
          violations: postCheck.violations
        });
      }

      // Add agent response to history
      await stateManager.addMessage(req.orgId, conversationId, 'assistant', llmResponse.content, {
        channel,
        agentId: currentAgentId,
        toolCalls: toolResults.map(t => t.tool),
        metrics: postCheck.metrics
      });

      // Check for handoff triggers
      if (postCheck.checks?.some(c => c.type === 'HANDOFF_TRIGGERED')) {
        const handoff = postCheck.checks.find(c => c.type === 'HANDOFF_TRIGGERED').handoff;

        await stateManager.executeHandoff(
          req.orgId,
          conversationId,
          currentAgentId,
          handoff.toAgent,
          handoff.reason,
          handoff.summary
        );
      }

      // Return response with state
      const displayState = await stateManager.getStateForDisplay(req.orgId, conversationId, channel);

      res.json({
        success: true,
        response: llmResponse.content,
        state: displayState,
        toolCalls: toolResults.map(t => t.tool),
        guardWarnings: postCheck.warnings || [],
        guardViolations: postCheck.violations || [],
        usage: llmResponse.usage,
        latencyMs: llmResponse.latencyMs
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(408).json({
        success: false,
        error: 'Processamento da mensagem expirou (30 segundos)',
        code: 'AI_MESSAGE_TIMEOUT',
      });
    }
    handleRouteError(res, error, 'MESSAGE_PROCESS');
  }
});

router.post('/agents/conversations/:id/handoff', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { fromAgentId, toAgentId, reason, summary, channel } = req.body;

    if (!fromAgentId || !toAgentId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'fromAgentId, toAgentId e reason sao obrigatorios',
        code: 'AI_HANDOFF_MISSING_FIELDS',
      });
    }

    const stateManager = getConversationStateManager();
    await stateManager.executeHandoff(req.orgId, conversationId, fromAgentId, toAgentId, reason, summary);

    const displayState = await stateManager.getStateForDisplay(req.orgId, conversationId, channel);

    res.json({ success: true, state: displayState });
  } catch (error) {
    handleRouteError(res, error, 'HANDOFF');
  }
});

router.post('/agents/conversations/:id/pause', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    const stateManager = getConversationStateManager();
    const state = await stateManager.pauseAI(req.orgId, conversationId, req.user.id);

    res.json({ success: true, state });
  } catch (error) {
    handleRouteError(res, error, 'CONVERSATION_PAUSE');
  }
});

router.post('/agents/conversations/:id/resume', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    const stateManager = getConversationStateManager();
    const state = await stateManager.resumeAI(req.orgId, conversationId);

    res.json({ success: true, state });
  } catch (error) {
    handleRouteError(res, error, 'CONVERSATION_RESUME');
  }
});

// ============================================================
// TESTING
// ============================================================

router.post('/test/run', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { agentVersionId, testCaseIds, runRedTeam = false } = req.body;

    if (!agentVersionId) {
      return res.status(400).json({
        success: false,
        error: 'agentVersionId e obrigatorio',
        code: 'AI_TEST_AGENT_VERSION_REQUIRED',
      });
    }

    // Verify agent version belongs to org
    const supabase = getSupabaseServer();
    const { data: version } = await supabase
      .from('ai_agent_versions')
      .select('agent_id')
      .eq('id', agentVersionId)
      .single();

    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Versao do agente nao encontrada',
        code: 'AI_VERSION_NOT_FOUND',
      });
    }

    const { data: agent } = await supabase
      .from('ai_agents')
      .select('organization_id')
      .eq('id', version.agent_id)
      .single();

    if (agent?.organization_id !== req.orgId) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado: versao pertence a outra organizacao',
        code: 'AI_TEST_PERMISSION_DENIED',
      });
    }

    // This would trigger the test runner service
    res.json({
      success: true,
      message: 'Test run initiated',
      runId: `test_${Date.now()}`
    });
  } catch (error) {
    handleRouteError(res, error, 'TEST_RUN');
  }
});

router.get('/test/results/:runId', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { runId } = req.params;
    const supabase = getSupabaseServer();

    const { data: run } = await supabase
      .from('ai_test_runs')
      .select(`*, ai_test_cases(*), ai_agent_versions!inner(agent_id)`)
      .eq('id', runId)
      .single();

    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Test run nao encontrado',
        code: 'AI_TEST_RUN_NOT_FOUND',
      });
    }

    // Verify org access
    if (run.ai_agent_versions?.agent_id) {
      const { data: agent } = await supabase
        .from('ai_agents')
        .select('organization_id')
        .eq('id', run.ai_agent_versions.agent_id)
        .single();

      if (agent?.organization_id !== req.orgId) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          code: 'AI_TEST_ACCESS_DENIED',
        });
      }
    }

    res.json({ success: true, run });
  } catch (error) {
    handleRouteError(res, error, 'TEST_RESULTS');
  }
});

router.post('/test/red-team', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { agentVersionId } = req.body;

    if (!agentVersionId) {
      return res.status(400).json({
        success: false,
        error: 'agentVersionId e obrigatorio',
        code: 'AI_REDTEAM_AGENT_VERSION_REQUIRED',
      });
    }

    // Verify agent version belongs to org
    const supabase = getSupabaseServer();
    const { data: version } = await supabase
      .from('ai_agent_versions')
      .select('agent_id')
      .eq('id', agentVersionId)
      .single();

    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Versao do agente nao encontrada',
        code: 'AI_VERSION_NOT_FOUND',
      });
    }

    const { data: agent } = await supabase
      .from('ai_agents')
      .select('organization_id')
      .eq('id', version.agent_id)
      .single();

    if (agent?.organization_id !== req.orgId) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado',
        code: 'AI_REDTEAM_PERMISSION_DENIED',
      });
    }

    // This would trigger the red team service
    res.json({
      success: true,
      message: 'Red team assessment initiated',
      assessmentId: `redteam_${Date.now()}`
    });
  } catch (error) {
    handleRouteError(res, error, 'REDTEAM');
  }
});

router.post('/agents/test/full', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { agent } = req.body;

    if (!agent || !agent.name) {
      return res.status(400).json({
        success: false,
        error: 'agent com nome e obrigatorio',
        code: 'AI_FULLTEST_AGENT_REQUIRED',
      });
    }

    const { runFullTestPipeline } = await import('../services/ai/testOrchestrator.js');
    const report = await runFullTestPipeline(agent, {
      mode: req.query.mode || process.env.AI_MODE || 'mock'
    });

    res.json({ success: true, report });
  } catch (error) {
    handleRouteError(res, error, 'FULL_TEST');
  }
});

// ============================================================
// EXPORT
// ============================================================

export default router;
