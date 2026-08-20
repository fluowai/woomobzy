/**
 * AI Agents API Routes
 * 
 * Handles individual agent management, versions, testing, and conversation handling
 */

import express from 'express';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { getPolicyEngine } from '../services/ai/toolRegistry.js';
import { getConversationStateManager } from '../services/ai/conversationStateManager.js';
import ConversationGuard from '../services/ai/conversationGuard.js';
import { getLLMOrchestrator } from '../services/ai/llmProvider.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const getOrgId = async (req) => {
  return req.headers['x-organization-id'] || req.query.organization_id;
};

const getUserId = async (req) => {
  return req.headers['x-user-id'] || req.query.user_id;
};

// ============================================================
// AGENT CRUD
// ============================================================

/**
 * GET /api/ai/agents
 * List agents (with optional operation filter)
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { operation_id, status } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: 'organization_id required' });
    }

    const supabase = getSupabaseServer();
    
    let query = supabase
      .from('ai_agents')
      .select(`
        *,
        ai_agent_versions!inner(id, version, score, published_at, created_at)
      `)
      .eq('organization_id', organizationId);

    if (operation_id) query = query.eq('operation_id', operation_id);
    if (status) query = query.eq('status', status);

    query = query.order('created_at', { ascending: false });

    const { data: agents, error } = await query;

    if (error) throw error;

    res.json({ agents: agents || [] });
  } catch (error) {
    logger.error('[aiAgents] List error', { error: error.message });
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

/**
 * GET /api/ai/agents/:id
 * Get agent with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id } = req.params;

    const supabase = getSupabaseServer();
    
    const { data: agent, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get all versions
    const { data: versions } = await supabase
      .from('ai_agent_versions')
      .select('*')
      .eq('agent_id', id)
      .order('created_at', { ascending: false });

    // Get tools for active version
    let tools = [];
    if (agent.active_version_id) {
      const { data: agentTools } = await supabase
        .from('ai_agent_tools')
        .select(`
          config_override,
          ai_tools(*)
        `)
        .eq('agent_version_id', agent.active_version_id);
      
      tools = agentTools?.map(t => ({ ...t.ai_tools, configOverride: t.config_override })) || [];
    }

    // Get knowledge sources
    let knowledge = [];
    if (agent.active_version_id) {
      const { data: agentKnowledge } = await supabase
        .from('ai_agent_knowledge')
        .select(`
          priority,
          ai_knowledge_sources(*)
        `)
        .eq('agent_version_id', agent.active_version_id);
      
      knowledge = agentKnowledge?.map(k => ({ ...k.ai_knowledge_sources, priority: k.priority })) || [];
    }

    // Get handoffs
    const { data: handoffs } = await supabase
      .from('ai_handoffs')
      .select('*')
      .or(`from_agent_id.eq.${id},to_agent_id.eq.${id}`)
      .eq('is_active', true);

    // Get channel rules
    const { data: channelRules } = await supabase
      .from('ai_channel_rules')
      .select('*')
      .eq('agent_id', id);

    // Get recent test runs
    const { data: testRuns } = await supabase
      .from('ai_test_runs')
      .select(`
        *,
        ai_test_cases(name, category)
      `)
      .eq('agent_version_id', agent.active_version_id)
      .order('started_at', { ascending: false })
      .limit(20);

    // Get red team results
    const { data: redTeamResults } = await supabase
      .from('ai_red_team_results')
      .select('*')
      .eq('agent_version_id', agent.active_version_id)
      .eq('status', 'OPEN')
      .order('severity', { ascending: false });

    res.json({
      agent: {
        ...agent,
        versions: versions || [],
        tools,
        knowledge,
        handoffs: handoffs || [],
        channelRules: channelRules || [],
        recentTests: testRuns || [],
        redTeamIssues: redTeamResults || []
      }
    });
  } catch (error) {
    logger.error('[aiAgents] Get error', { error: error.message });
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

/**
 * POST /api/ai/agents
 * Create agent (usually done via architect, but allow manual)
 */
router.post('/', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const userId = await getUserId(req);
    const { operation_id, name, type, role, description } = req.body;

    if (!organizationId || !operation_id || !name || !role) {
      return res.status(400).json({ error: 'organization_id, operation_id, name, role required' });
    }

    const supabase = getSupabaseServer();
    
    // Verify operation belongs to org
    const { data: operation } = await supabase
      .from('ai_operations')
      .select('id')
      .eq('id', operation_id)
      .eq('organization_id', organizationId)
      .single();

    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const { data: agent, error } = await supabase
      .from('ai_agents')
      .insert({
        operation_id,
        organization_id: organizationId,
        name,
        type: type || 'SPECIALIST',
        role,
        description,
        status: 'DRAFT'
      })
      .select()
      .single();

    if (error) throw error;

    // Audit
    await supabase.from('ai_audit_logs').insert({
      organization_id: organizationId,
      actor_id: userId,
      actor_type: 'USER',
      entity_type: 'ai_agent',
      entity_id: agent.id,
      action: 'create',
      after_state: agent
    });

    res.status(201).json({ agent });
  } catch (error) {
    logger.error('[aiAgents] Create error', { error: error.message });
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

/**
 * PATCH /api/ai/agents/:id
 * Update agent configuration
 */
router.patch('/:id', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const userId = await getUserId(req);
    const { id } = req.params;
    const updates = req.body;

    const supabase = getSupabaseServer();
    
    const { data: current } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!current) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Don't allow direct status changes to PUBLISHED - must go through testing
    const allowedFields = ['name', 'role', 'description', 'channel_config', 'status'];
    const updateData = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined && field !== 'status') {
        updateData[field] = updates[field];
      }
    }
    
    // Allow status changes only to DRAFT, TESTING, PAUSED, ARCHIVED
    if (updates.status && ['DRAFT', 'TESTING', 'PAUSED', 'ARCHIVED'].includes(updates.status)) {
      updateData.status = updates.status;
    }
    
    updateData.updated_at = new Date().toISOString();

    const { data: agent, error } = await supabase
      .from('ai_agents')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    // Audit
    await supabase.from('ai_audit_logs').insert({
      organization_id: organizationId,
      actor_id: userId,
      actor_type: 'USER',
      entity_type: 'ai_agent',
      entity_id: id,
      action: 'update',
      before_state: current,
      after_state: agent
    });

    res.json({ agent });
  } catch (error) {
    logger.error('[aiAgents] Update error', { error: error.message });
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// ============================================================
// AGENT VERSIONS
// ============================================================

/**
 * POST /api/ai/agents/:id/versions
 * Create new version of agent
 */
router.post('/:id/versions', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const userId = await getUserId(req);
    const { id } = req.params;
    const { 
      prompt, model, modelConfig, tools, permissions, 
      guardrails, handoffConfig, memoryConfig, workflowConfig 
    } = req.body;

    const supabase = getSupabaseServer();
    
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
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
      const lastVersion = versions[0].version;
      const parts = lastVersion.split('.').map(Number);
      parts[1] = (parts[1] || 0) + 1;
      nextVersion = parts.join('.');
    }

    // Create new version
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
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    // Link tools
    if (tools && tools.length > 0) {
      for (const toolName of tools) {
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
      }
    }

    // Audit
    await supabase.from('ai_audit_logs').insert({
      organization_id: organizationId,
      actor_id: userId,
      actor_type: 'USER',
      entity_type: 'ai_agent_version',
      entity_id: version.id,
      action: 'create',
      after_state: { version: nextVersion, agentId: id }
    });

    res.status(201).json({ version });
  } catch (error) {
    logger.error('[aiAgents] Create version error', { error: error.message });
    res.status(500).json({ error: 'Failed to create version' });
  }
});

/**
 * GET /api/ai/agents/:id/versions
 * List agent versions
 */
router.get('/:id/versions', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id } = req.params;

    const supabase = getSupabaseServer();
    
    // Verify agent belongs to org
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { data: versions } = await supabase
      .from('ai_agent_versions')
      .select('*')
      .eq('agent_id', id)
      .order('created_at', { ascending: false });

    res.json({ versions: versions || [] });
  } catch (error) {
    logger.error('[aiAgents] List versions error', { error: error.message });
    res.status(500).json({ error: 'Failed to list versions' });
  }
});

/**
 * POST /api/ai/agents/:id/versions/:version/rollback
 * Rollback agent to a specific version
 */
router.post('/:id/versions/:version/rollback', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const userId = await getUserId(req);
    const { id, version: versionStr } = req.params;

    const supabase = getSupabaseServer();
    
    // Get target version
    const { data: targetVersion } = await supabase
      .from('ai_agent_versions')
      .select('*')
      .eq('agent_id', id)
      .eq('version', versionStr)
      .single();

    if (!targetVersion) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Get current active version for audit
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('active_version_id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    // Create NEW version as copy of target (immutable history)
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

    const { data: newVersion } = await supabase
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
        created_by: userId
      })
      .select()
      .single();

    // Set as active
    await supabase
      .from('ai_agents')
      .update({ 
        active_version_id: newVersion.id,
        status: 'DRAFT', // Rollback puts in draft for review
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // Copy tool links
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

    // Audit
    await supabase.from('ai_audit_logs').insert({
      organization_id: organizationId,
      actor_id: userId,
      actor_type: 'USER',
      entity_type: 'ai_agent',
      entity_id: id,
      action: 'rollback',
      before_state: { activeVersionId: agent?.active_version_id },
      after_state: { activeVersionId: newVersion.id, rolledBackFrom: versionStr }
    });

    res.json({ 
      success: true, 
      message: `Rolled back to version ${versionStr} (created new version ${nextVersion})`,
      version: newVersion
    });
  } catch (error) {
    logger.error('[aiAgents] Rollback error', { error: error.message });
    res.status(500).json({ error: 'Failed to rollback' });
  }
});

// ============================================================
// CONVERSATION HANDLING
// ============================================================

/**
 * POST /api/ai/conversations/state
 * Get or create conversation state
 */
router.post('/conversations/state', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { conversationId, channel, instanceId, leadId } = req.body;

    if (!organizationId || !conversationId || !channel) {
      return res.status(400).json({ error: 'organizationId, conversationId, channel required' });
    }

    const stateManager = getConversationStateManager();
    const state = await stateManager.getOrCreateState(organizationId, conversationId, channel, instanceId);

    if (leadId) {
      await stateManager.updateState(organizationId, conversationId, { leadId });
    }

    // Return display-formatted state
    const displayState = await stateManager.getStateForDisplay(organizationId, conversationId, channel);
    
    res.json({ state: displayState });
  } catch (error) {
    logger.error('[aiAgents] Conversation state error', { error: error.message });
    res.status(500).json({ error: 'Failed to get conversation state' });
  }
});

/**
 * POST /api/ai/conversations/state/update
 * Update conversation state (slots, intent, etc.)
 */
router.post('/conversations/state/update', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { conversationId, ...updates } = req.body;

    if (!organizationId || !conversationId) {
      return res.status(400).json({ error: 'organizationId, conversationId required' });
    }

    const stateManager = getConversationStateManager();
    const state = await stateManager.updateState(organizationId, conversationId, updates);
    
    const displayState = await stateManager.getStateForDisplay(organizationId, conversationId, updates.channel);
    
    res.json({ state: displayState });
  } catch (error) {
    logger.error('[aiAgents] Update conversation state error', { error: error.message });
    res.status(500).json({ error: 'Failed to update conversation state' });
  }
});

/**
 * POST /api/ai/conversations/:id/message
 * Process a message through the agent pipeline
 */
router.post('/conversations/:id/message', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id: conversationId } = req.params;
    const { message, channel, instanceId, agentId } = req.body;

    if (!organizationId || !message || !channel) {
      return res.status(400).json({ error: 'organizationId, message, channel required' });
    }

    const stateManager = getConversationStateManager();
    const guard = new ConversationGuard();
    const llm = getLLMOrchestrator();
    const policyEngine = getPolicyEngine();
    const supabase = getSupabaseServer();

    // Get or create conversation state
    let state = await stateManager.getOrCreateState(organizationId, conversationId, channel, instanceId);
    
    // Add user message to history
    await stateManager.addMessage(organizationId, conversationId, 'user', message, { channel });

    // Update state with new message
    state = await stateManager.getOrCreateState(organizationId, conversationId, channel, instanceId);

    // Determine which agent should handle this
    let currentAgentId = agentId || state.currentAgentId;
    
    // If no agent assigned, we'd need orchestrator to route
    // For now, use provided or existing
    if (!currentAgentId) {
      return res.status(400).json({ error: 'No agent assigned to conversation' });
    }

    // Get agent with active version
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('*, ai_agent_versions!inner(*)')
      .eq('id', currentAgentId)
      .eq('organization_id', organizationId)
      .single();

    if (!agent || !agent.ai_agent_versions) {
      return res.status(404).json({ error: 'Agent or version not found' });
    }

    const version = agent.ai_agent_versions;

    // Pre-generation guard check
    const preCheck = await guard.preGenerationCheck(version, message, state);
    
    if (!preCheck.passed) {
      // Blocked - return error with guidance
      return res.status(400).json({ 
        error: 'Pre-generation checks failed',
        blocks: preCheck.blocks,
        recommendedActions: preCheck.recommendedActions
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

    // Call LLM with tools
    const toolConfig = {
      tools: version.tools,
      toolChoice: 'auto'
    };

    // For now, use a simple approach - in production this would use the full orchestrator
    const llmResponse = await llm.chat(messages, 'conversation', {
      model: version.model,
      temperature: version.modelConfig?.temperature,
      maxTokens: version.modelConfig?.maxTokens,
      topP: version.modelConfig?.topP,
      ...toolConfig
    });

    // Execute any tool calls
    let toolResults = [];
    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      for (const toolCall of llmResponse.toolCalls) {
        const toolName = toolCall.function?.name;
        const toolArgs = JSON.parse(toolCall.function?.arguments || '{}');
        
        const result = await policyEngine.executeToolCall(
          version.id, 
          toolName, 
          toolArgs, 
          { organizationId, conversationId, leadId: state.leadId, channel }
        );
        
        toolResults.push({ tool: toolName, input: toolArgs, result });
        
        // Record tool result in state
        await stateManager.recordToolResult(organizationId, conversationId, toolName, toolArgs, result);
      }
      
      // If tools were called, send results back to LLM for final response
      if (toolResults.length > 0) {
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
      // Log violations but still return response (with warnings)
      logger.warn('[aiAgents] Post-generation violations', { 
        conversationId, 
        violations: postCheck.violations 
      });
    }

    // Add agent response to history
    await stateManager.addMessage(organizationId, conversationId, 'assistant', llmResponse.content, { 
      channel, 
      agentId: currentAgentId,
      toolCalls: toolResults.map(t => t.tool),
      metrics: postCheck.metrics
    });

    // Check for handoff triggers
    if (postCheck.checks?.some(c => c.type === 'HANDOFF_TRIGGERED')) {
      const handoff = postCheck.checks.find(c => c.type === 'HANDOFF_TRIGGERED').handoff;
      
      await stateManager.executeHandoff(
        organizationId, 
        conversationId, 
        currentAgentId, 
        handoff.toAgent, 
        handoff.reason, 
        handoff.summary
      );
    }

    // Return response with state
    const displayState = await stateManager.getStateForDisplay(organizationId, conversationId, channel);
    
    res.json({
      response: llmResponse.content,
      state: displayState,
      toolCalls: toolResults.map(t => t.tool),
      guardWarnings: postCheck.warnings || [],
      guardViolations: postCheck.violations || [],
      usage: llmResponse.usage,
      latencyMs: llmResponse.latencyMs
    });
  } catch (error) {
    logger.error('[aiAgents] Process message error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to process message' });
  }
});

/**
 * POST /api/ai/conversations/:id/handoff
 * Execute handoff between agents
 */
router.post('/conversations/:id/handoff', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id: conversationId } = req.params;
    const { fromAgentId, toAgentId, reason, summary } = req.body;

    if (!organizationId || !fromAgentId || !toAgentId || !reason) {
      return res.status(400).json({ error: 'organizationId, fromAgentId, toAgentId, reason required' });
    }

    const stateManager = getConversationStateManager();
    const state = await stateManager.executeHandoff(organizationId, conversationId, fromAgentId, toAgentId, reason, summary);
    
    const displayState = await stateManager.getStateForDisplay(organizationId, conversationId, req.body.channel);
    
    res.json({ success: true, state: displayState });
  } catch (error) {
    logger.error('[aiAgents] Handoff error', { error: error.message });
    res.status(500).json({ error: 'Failed to execute handoff' });
  }
});

/**
 * POST /api/ai/conversations/:id/pause
 * Pause AI (human takeover)
 */
router.post('/conversations/:id/pause', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const userId = await getUserId(req);
    const { id: conversationId } = req.params;

    const stateManager = getConversationStateManager();
    const state = await stateManager.pauseAI(organizationId, conversationId, userId);
    
    res.json({ success: true, state });
  } catch (error) {
    logger.error('[aiAgents] Pause error', { error: error.message });
    res.status(500).json({ error: 'Failed to pause AI' });
  }
});

/**
 * POST /api/ai/conversations/:id/resume
 * Resume AI after human takeover
 */
router.post('/conversations/:id/resume', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id: conversationId } = req.params;

    const stateManager = getConversationStateManager();
    const state = await stateManager.resumeAI(organizationId, conversationId);
    
    res.json({ success: true, state });
  } catch (error) {
    logger.error('[aiAgents] Resume error', { error: error.message });
    res.status(500).json({ error: 'Failed to resume AI' });
  }
});

// ============================================================
// TESTING
// ============================================================

/**
 * POST /api/ai/test/run
 * Run test suite for agent version
 */
router.post('/test/run', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { agentVersionId, testCaseIds, runRedTeam = false } = req.body;

    if (!organizationId || !agentVersionId) {
      return res.status(400).json({ error: 'organizationId, agentVersionId required' });
    }

    // This would trigger the test runner service
    // For now, return a placeholder
    res.json({ 
      success: true, 
      message: 'Test run initiated',
      runId: `test_${Date.now()}`
    });
  } catch (error) {
    logger.error('[aiAgents] Test run error', { error: error.message });
    res.status(500).json({ error: 'Failed to run tests' });
  }
});

/**
 * GET /api/ai/test/results/:runId
 * Get test run results
 */
router.get('/test/results/:runId', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { runId } = req.params;

    const supabase = getSupabaseServer();
    
    const { data: run } = await supabase
      .from('ai_test_runs')
      .select(`
        *,
        ai_test_cases(*),
        ai_agent_versions!inner(agent_id)
      `)
      .eq('id', runId)
      .single();

    if (!run) {
      return res.status(404).json({ error: 'Test run not found' });
    }

    // Verify org access
    if (run.ai_agent_versions?.agent_id) {
      const { data: agent } = await supabase
        .from('ai_agents')
        .select('organization_id')
        .eq('id', run.ai_agent_versions.agent_id)
        .single();
      
      if (agent?.organization_id !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ run });
  } catch (error) {
    logger.error('[aiAgents] Get test results error', { error: error.message });
    res.status(500).json({ error: 'Failed to get test results' });
  }
});

/**
 * POST /api/ai/test/red-team
 * Run AI Red Team on agent version
 */
router.post('/test/red-team', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { agentVersionId } = req.body;

    if (!organizationId || !agentVersionId) {
      return res.status(400).json({ error: 'organizationId, agentVersionId required' });
    }

    // This would trigger the red team service
    res.json({ 
      success: true, 
      message: 'Red team assessment initiated',
      assessmentId: `redteam_${Date.now()}`
    });
  } catch (error) {
    logger.error('[aiAgents] Red team error', { error: error.message });
    res.status(500).json({ error: 'Failed to run red team' });
  }
});

/**
 * POST /api/ai/test/full
 * Run the complete test pipeline (generator + runner + red team + score + auto-fix)
 */
router.post('/test/full', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { agent } = req.body;

    if (!organizationId || !agent || !agent.name) {
      return res.status(400).json({ error: 'organizationId and agent required' });
    }

    const { runFullTestPipeline } = await import('../services/ai/testOrchestrator.js');
    const report = await runFullTestPipeline(agent, {
      mode: req.query.mode || process.env.AI_MODE || 'mock'
    });

    res.json({ success: true, report });
  } catch (error) {
    logger.error('[aiAgents] Full test pipeline error', { error: error.message });
    res.status(500).json({ error: 'Failed to run full test pipeline' });
  }
});

export default router;