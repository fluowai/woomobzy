/**
 * AI Operations API Routes
 * 
 * Handles CRUD for AI Operations (workforce teams) and Agent Architect triggering
 */

import express from 'express';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { getAgentArchitect } from '../services/ai/agentArchitect.js';
import { getToolRegistry } from '../services/ai/toolRegistry.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Middleware to get organization_id from authenticated user
const getOrgId = async (req) => {
  // req.orgId é a fonte da verdade (definida pelo verifyAuth + requireTenant)
  return req.orgId || req.headers['x-organization-id'] || req.query.organization_id;
};

const getArchitectErrorResponse = (error) => {
  const message = error instanceof Error ? error.message : 'Falha desconhecida ao gerar a arquitetura.';

  if (/nenhum provedor|provedor não inicializado|api.?key|unauthorized|invalid api key/i.test(message)) {
    return { status: 503, error: 'Nenhum provedor de IA está disponível. Configure uma chave válida no painel de configurações.' };
  }

  if (/model.*(not found|not supported|retired|deprecated)|404.*model/i.test(message)) {
    return { status: 422, error: 'O modelo de IA selecionado não está mais disponível. Selecione Gemini 2.0 Flash e tente novamente.' };
  }

  return { status: 502, error: `O provedor de IA não conseguiu gerar a arquitetura: ${message}` };
};

/**
 * POST /api/ai/operations
 * Create a new AI Operation (workforce)
 */
router.post('/', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'organization_id required' });
    }

    const { name, segment, businessModel, objectives } = req.body;
    
    if (!name || !segment) {
      return res.status(400).json({ error: 'name and segment are required' });
    }

    const validSegments = ['URBAN_REAL_ESTATE', 'RURAL_REAL_ESTATE', 'DEVELOPER', 'BUILDER', 'LAND_DEVELOPER'];
    if (!validSegments.includes(segment)) {
      return res.status(400).json({ error: 'Invalid segment' });
    }

    const supabase = getSupabaseServer();
    
    const { data: operation, error } = await supabase
      .from('ai_operations')
      .insert({
        organization_id: organizationId,
        name,
        segment,
        business_model: businessModel || {},
        objectives: objectives || [],
        status: 'DRAFT'
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supabase.from('ai_audit_logs').insert({
      organization_id: organizationId,
      actor_type: 'USER',
      entity_type: 'ai_operation',
      entity_id: operation.id,
      action: 'create',
      after_state: operation
    });

    res.status(201).json({ operation });
  } catch (error) {
    logger.error('[aiOperations] Create error', { error: error.message });
    res.status(500).json({ error: 'Failed to create operation' });
  }
});

/**
 * GET /api/ai/operations
 * List all operations for organization
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'organization_id required' });
    }

    const supabase = getSupabaseServer();
    
    const { data: operations, error } = await supabase
      .from('ai_operations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get agent counts for each operation
    const operationsWithCounts = await Promise.all(
      (operations || []).map(async (op) => {
        const { count } = await supabase
          .from('ai_agents')
          .select('*', { count: 'exact', head: true })
          .eq('operation_id', op.id);
        
        const { count: activeCount } = await supabase
          .from('ai_agents')
          .select('*', { count: 'exact', head: true })
          .eq('operation_id', op.id)
          .eq('status', 'PUBLISHED');
        
        return {
          ...op,
          agentsCount: count || 0,
          activeAgentsCount: activeCount || 0
        };
      })
    );

    res.json({ operations: operationsWithCounts });
  } catch (error) {
    logger.error('[aiOperations] List error', { error: error.message });
    res.status(500).json({ error: 'Failed to list operations' });
  }
});

/**
 * GET /api/ai/operations/:id
 * Get operation with full details (agents, workflows, etc.)
 */
router.get('/:id', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id } = req.params;

    const supabase = getSupabaseServer();
    
    const { data: operation, error } = await supabase
      .from('ai_operations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    // Get agents
    const { data: agents } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('operation_id', id)
      .order('created_at', { ascending: true });

    // Get active versions for each agent
    const agentsWithVersions = await Promise.all(
      (agents || []).map(async (agent) => {
        const { data: versions } = await supabase
          .from('ai_agent_versions')
          .select('id, version, model, model_config, score, published_at, created_at')
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false });
        
        return { ...agent, versions: versions || [] };
      })
    );

    // Get workflows
    const { data: workflows } = await supabase
      .from('ai_workflows')
      .select('*')
      .eq('operation_id', id)
      .eq('is_active', true);

    const agentIds = (agents || []).map(a => a.id);
    const { data: channelRules, error: channelRulesError } = agentIds.length > 0
      ? await supabase
        .from('ai_channel_rules')
        .select('*')
        .in('agent_id', agentIds)
        .eq('is_active', true)
      : { data: [], error: null };

    if (channelRulesError) throw channelRulesError;

    res.json({
      operation: {
        ...operation,
        agents: agentsWithVersions,
        workflows: workflows || [],
        channelRules: channelRules || []
      }
    });
  } catch (error) {
    logger.error('[aiOperations] Get error', { error: error.message });
    res.status(500).json({ error: 'Failed to get operation' });
  }
});

/**
 * PATCH /api/ai/operations/:id
 * Update operation
 */
router.patch('/:id', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id } = req.params;
    const updates = req.body;

    const supabase = getSupabaseServer();
    
    // Get current state for audit
    const { data: current } = await supabase
      .from('ai_operations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!current) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const allowedFields = ['name', 'business_model', 'objectives', 'status', 'architecture'];
    const updateData = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }
    updateData.updated_at = new Date().toISOString();

    const { data: operation, error } = await supabase
      .from('ai_operations')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    
    // Sync agents status if operation status changed
    if (updateData.status && updateData.status !== current.status) {
      if (updateData.status === 'PUBLISHED' || updateData.status === 'PAUSED') {
        await supabase
          .from('ai_agents')
          .update({ status: updateData.status, updated_at: new Date().toISOString() })
          .eq('operation_id', id);
      }
    }

    // Audit log
    await supabase.from('ai_audit_logs').insert({
      organization_id: organizationId,
      actor_type: 'USER',
      entity_type: 'ai_operation',
      entity_id: id,
      action: 'update',
      before_state: current,
      after_state: operation
    });

    res.json({ operation });
  } catch (error) {
    logger.error('[aiOperations] Update error', { error: error.message });
    res.status(500).json({ error: 'Failed to update operation' });
  }
});

/**
 * POST /api/ai/operations/:id/architect
 * Trigger Agent Architect to design the agent team
 */
router.post('/:id/architect', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id } = req.params;
    const selectedProvider = req.body?.provider || req.query?.provider;
    const selectedModel = req.body?.model || req.query?.model;

    const supabase = getSupabaseServer();
    
    // Get operation
    const { data: operation, error: opError } = await supabase
      .from('ai_operations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (opError || !operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from('organizations')
      .select('id, name, slug, niche, feature_flags')
      .eq('id', organizationId)
      .single();

    // Get available channels (WhatsApp instances, etc.)
    const { data: whatsappInstances } = await supabase
      .from('whatsapp_instances')
      .select('id, name, status, phone')
      .eq('tenant_id', organizationId)
      .eq('status', 'connected');

    // Get available tools
    const toolRegistry = getToolRegistry();
    const availableTools = await toolRegistry.getToolsForOrganization(organizationId);

    // Get knowledge sources
    const { data: knowledgeSources } = await supabase
      .from('ai_knowledge_sources')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    const { data: siteSettings } = await supabase
      .from('site_settings')
      .select('integrations')
      .eq('organization_id', organizationId)
      .maybeSingle();

    // Get environments for segment info
    const { data: environments } = await supabase
      .from('environments')
      .select('*')
      .eq('organization_id', organizationId);

    // Build architect input
    const architectInput = {
      tenant: tenant || { id: organizationId, name: 'Imobiliária' },
      segment: operation.segment,
      businessModel: operation.business_model,
      objectives: operation.objectives,
      channelsAvailable: (whatsappInstances || []).map(i => ({
        type: 'whatsapp',
        instanceId: i.id,
        name: i.name,
        phone: i.phone
      })),
      crmConfiguration: { enabled: true }, // Would get from settings
      funnels: [], // Would get from CRM settings
      availableTools,
      knowledgeSources: knowledgeSources || [],
      businessRules: operation.business_model?.rules || [],
      llmIntegrations: siteSettings?.integrations || null
    };

    // Update status to ARCHITECTURE_DESIGN
    await supabase
      .from('ai_operations')
      .update({ status: 'ARCHITECTURE_DESIGN', updated_at: new Date().toISOString() })
      .eq('id', id);

    // Call Agent Architect
    const architect = await getAgentArchitect();
    const architecture = await architect.designArchitecture(architectInput, selectedProvider, selectedModel);

    // Save architecture to operation
    await supabase
      .from('ai_operations')
      .update({ 
        architecture: architecture.operation,
        status: 'CONFIGURING',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // Create agents from architecture
    const createdAgents = [];
    for (const agentSpec of architecture.operation.agents || []) {
      const { data: agent } = await supabase
        .from('ai_agents')
        .insert({
          operation_id: id,
          organization_id: organizationId,
          name: agentSpec.name,
          type: agentSpec.type,
          role: agentSpec.role,
          description: agentSpec.description,
          status: 'DRAFT',
          channel_config: {}
        })
        .select()
        .single();

      if (agent) {
        // Create first version
        const promptBlocks = agentSpec.promptBlocks.sort((a, b) => a.priority - b.priority);
        const fullPrompt = promptBlocks.map(b => `${b.blockType}\n${b.content}`).join('\n\n');
        
        const { data: version } = await supabase
          .from('ai_agent_versions')
          .insert({
            agent_id: agent.id,
            version: '1.0',
            prompt: { blocks: promptBlocks, full: fullPrompt },
            model: agentSpec.model,
            model_config: agentSpec.modelConfig,
            tools: agentSpec.tools,
            permissions: agentSpec.permissions,
            guardrails: agentSpec.guardrails,
            handoff_config: { handoffs: agentSpec.handoffs },
            memory_config: agentSpec.memoryConfig,
            workflow_config: agentSpec.workflowConfig,
            created_by: req.authUserId || req.headers['x-user-id']
          })
          .select()
          .single();

        if (version) {
          // Link tools
          for (const toolName of agentSpec.tools) {
            const tool = availableTools.find(t => t.name === toolName);
            if (tool) {
              await supabase.from('ai_agent_tools').insert({
                agent_version_id: version.id,
                tool_id: tool.id
              });
            }
          }

          // Set as active version
          await supabase
            .from('ai_agents')
            .update({ active_version_id: version.id })
            .eq('id', agent.id);
        }

        createdAgents.push({ ...agent, version, specId: agentSpec.id });
      }
    }

    // Create workflows
    for (const workflowSpec of architecture.operation.workflows || []) {
      await supabase.from('ai_workflows').insert({
        operation_id: id,
        name: workflowSpec.name,
        description: workflowSpec.description,
        trigger_type: workflowSpec.triggerType,
        trigger_config: workflowSpec.triggerConfig,
        steps: workflowSpec.steps
      });
    }

    // Create handoffs
    for (const agentSpec of architecture.operation.agents || []) {
      const fromAgent = createdAgents.find(a => a.specId === agentSpec.id || a.role === agentSpec.role);
      if (!fromAgent) continue;

      for (const handoff of agentSpec.handoffs || []) {
        const toAgent = createdAgents.find(a => a.role === handoff.toAgentRole);
        if (toAgent) {
          await supabase.from('ai_handoffs').insert({
            organization_id: organizationId,
            from_agent_id: fromAgent.id,
            to_agent_id: toAgent.id,
            trigger_type: handoff.trigger,
            conditions: handoff.conditions,
            preserve_context: handoff.preserveContext,
            summary_template: handoff.summaryTemplate
          });
        }
      }
    }

    // Update status back to CONFIGURING (ready for review)
    await supabase
      .from('ai_operations')
      .update({ status: 'CONFIGURING', updated_at: new Date().toISOString() })
      .eq('id', id);

    // Audit log
    await supabase.from('ai_audit_logs').insert({
      organization_id: organizationId,
      actor_type: 'AI',
      entity_type: 'ai_operation',
      entity_id: id,
      action: 'architect',
      after_state: { agentsCount: createdAgents.length, architecture: architecture.operation }
    });

    res.json({ 
      architecture: architecture.operation,
      agents: createdAgents,
      testPlan: architecture.testPlan
    });
  } catch (error) {
    logger.error('[aiOperations] Architect error', { error: error.message, stack: error.stack });
    
    // Reset status on error
    const supabase = getSupabaseServer();
    await supabase
      .from('ai_operations')
      .update({ status: 'DRAFT', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    
    const response = getArchitectErrorResponse(error);
    res.status(response.status).json({ error: response.error });
  }
});

/**
 * POST /api/ai/operations/:id/publish
 * Publish operation (activate all agents)
 */
router.post('/:id/publish', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id } = req.params;
    const minScore = Number(req.body?.minScore ?? 90);

    if (!Number.isFinite(minScore) || minScore < 70 || minScore > 100) {
      return res.status(400).json({ error: 'minScore deve estar entre 70 e 100' });
    }

    const supabase = getSupabaseServer();
    const publishedAt = new Date().toISOString();
    
    // Get operation with agents
    const { data: operation, error: operationError } = await supabase
      .from('ai_operations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (operationError) throw operationError;

    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const { data: agents, error: agentsError } = await supabase
      .from('ai_agents')
      .select('id, name, status, active_version_id')
      .eq('operation_id', id)
      .eq('organization_id', organizationId);

    if (agentsError) throw agentsError;

    if (!agents || agents.length === 0) {
      return res.status(400).json({
        error: 'Operation has no agents to publish',
        code: 'AI_OPERATION_NO_AGENTS'
      });
    }

    const activeVersionIds = agents.map((agent) => agent.active_version_id).filter(Boolean);
    const { data: activeVersions, error: versionsError } = activeVersionIds.length > 0
      ? await supabase
        .from('ai_agent_versions')
        .select('id, agent_id, score, test_results, created_at')
        .in('id', activeVersionIds)
      : { data: [], error: null };

    if (versionsError) throw versionsError;

    const versionByAgentId = new Map((activeVersions || []).map((version) => [version.agent_id, version]));

    // Check all agents meet minimum score
    const unreadyAgents = (agents || []).filter(a => {
      const version = versionByAgentId.get(a.id);
      const tested = version?.test_results?.verdict && version?.test_results?.score?.overall !== undefined;
      return !a.active_version_id || !version?.id || !tested || (version.score || 0) < minScore;
    });

    if (unreadyAgents.length > 0) {
      return res.status(400).json({ 
        error: 'Some agents do not meet minimum score or do not have persisted test evidence',
        unreadyAgents: unreadyAgents.map(a => ({
          id: a.id,
          name: a.name,
          score: versionByAgentId.get(a.id)?.score || 0,
          activeVersionId: a.active_version_id || null,
          minScore
        }))
      });
    }

    // Publish all agents
    for (const agent of agents || []) {
      const { error: agentUpdateError } = await supabase
        .from('ai_agents')
        .update({ status: 'PUBLISHED', updated_at: publishedAt })
        .eq('id', agent.id)
        .eq('organization_id', organizationId);

      if (agentUpdateError) throw agentUpdateError;
      
      const activeVersion = versionByAgentId.get(agent.id);
      const { error: versionUpdateError } = await supabase
        .from('ai_agent_versions')
        .update({ published_at: publishedAt })
        .eq('id', activeVersion.id)
        .eq('agent_id', agent.id);

      if (versionUpdateError) throw versionUpdateError;
    }

    // Update operation
    const { error: updateOperationError } = await supabase
      .from('ai_operations')
      .update({ 
        status: 'PUBLISHED', 
        published_at: publishedAt,
        updated_at: publishedAt
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (updateOperationError) throw updateOperationError;

    // Audit log
    const { error: auditError } = await supabase.from('ai_audit_logs').insert({
      organization_id: organizationId,
      actor_type: 'USER',
      entity_type: 'ai_operation',
      entity_id: id,
      action: 'publish',
      after_state: { agentsPublished: agents.length, minScore, publishedAt }
    });

    if (auditError) throw auditError;

    res.json({ 
      success: true, 
      message: 'Operation published successfully',
      agentsPublished: agents.length
    });
  } catch (error) {
    logger.error('[aiOperations] Publish error', { error: error.message });
    res.status(500).json({ error: 'Failed to publish operation' });
  }
});

/**
 * GET /api/ai/operations/:id/metrics
 * Get operation metrics dashboard
 */
router.get('/:id/metrics', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id } = req.params;
    const { period = '30d' } = req.query;

    const supabase = getSupabaseServer();
    
    // Verify operation belongs to org
    const { data: operation } = await supabase
      .from('ai_operations')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    // Calculate time range
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get agents
    const { data: agents } = await supabase
      .from('ai_agents')
      .select('id, name, type, role, status, health_status, metrics')
      .eq('operation_id', id);

    const agentIds = (agents || []).map(a => a.id);
    const { data: logs, error: logsError } = agentIds.length > 0
      ? await supabase
        .from('ai_execution_logs')
        .select('agent_id, event_type, status, latency_ms, tokens, cost_usd, conversation_id, created_at')
        .eq('tenant_id', organizationId)
        .in('agent_id', agentIds)
        .gte('created_at', since)
      : { data: [], error: null };

    if (logsError) throw logsError;

    // Aggregate metrics
    const metrics = {
      period,
      agents: agents?.map(agent => {
        const agentLogs = logs?.filter(l => l.agent_id === agent.id) || [];
        const conversations = [...new Set(agentLogs.map(l => l.conversation_id).filter(Boolean))];
        const successful = agentLogs.filter(l => l.status === 'success').length;
        const failed = agentLogs.filter(l => l.status === 'failed').length;
        const handoffs = agentLogs.filter(l => l.event_type === 'HANDOFF').length;
        const toolCalls = agentLogs.filter(l => l.event_type === 'TOOL_EXECUTION').length;
        
        return {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          role: agent.role,
          status: agent.status,
          health: agent.health_status,
          conversations: conversations.length,
          successRate: agentLogs.length > 0 ? (successful / agentLogs.length * 100).toFixed(1) : 0,
          handoffs,
          toolCalls,
          avgLatency: agentLogs.length > 0 ? 
            (agentLogs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / agentLogs.length).toFixed(0) : 0,
          totalTokens: agentLogs.reduce((sum, l) => sum + (l.tokens || 0), 0),
          totalCost: agentLogs.reduce((sum, l) => sum + (l.cost_usd || 0), 0).toFixed(4)
        };
      }) || [],
      totals: {
        agents: agents?.length || 0,
        published: agents?.filter(a => a.status === 'PUBLISHED').length || 0,
        conversations: [...new Set(logs?.map(l => l.conversation_id).filter(Boolean) || [])].length,
        handoffs: logs?.filter(l => l.event_type === 'HANDOFF').length || 0,
        totalTokens: logs?.reduce((sum, l) => sum + (l.tokens || 0), 0) || 0,
        totalCost: logs?.reduce((sum, l) => sum + (l.cost_usd || 0), 0).toFixed(4) || 0,
        avgLatency: logs?.length ? 
          (logs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / logs.length).toFixed(0) : 0
      }
    };

    res.json({ metrics });
  } catch (error) {
    logger.error('[aiOperations] Metrics error', { error: error.message });
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

router.get('/:id/logs', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id } = req.params;
    const status = req.query.status ? String(req.query.status) : null;
    const q = req.query.q ? String(req.query.q).toLowerCase() : '';
    const limit = Math.min(Number(req.query.limit || 100), 500);

    const supabase = getSupabaseServer();
    const { data: agents, error: agentsError } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('operation_id', id)
      .eq('organization_id', organizationId);

    if (agentsError) throw agentsError;
    const agentIds = (agents || []).map((agent) => agent.id);

    let query = supabase
      .from('ai_execution_logs')
      .select('id, agent_id, event_type, status, latency_ms, tokens, cost_usd, conversation_id, metadata, created_at')
      .eq('tenant_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (agentIds.length === 0) {
      return res.json({ logs: [] });
    }

    query = query.in('agent_id', agentIds);

    if (status && status !== 'Todos') {
      query = query.eq('status', status);
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    const filtered = q
      ? (logs || []).filter((log) => JSON.stringify(log).toLowerCase().includes(q))
      : logs || [];

    res.json({ logs: filtered });
  } catch (error) {
    logger.error('[aiOperations] Logs error', { error: error.message });
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit || 100), 500);

    const supabase = getSupabaseServer();
    const { data: history, error } = await supabase
      .from('ai_audit_logs')
      .select('id, actor_type, entity_type, entity_id, action, before_state, after_state, created_at')
      .eq('organization_id', organizationId)
      .eq('entity_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ history: history || [] });
  } catch (error) {
    logger.error('[aiOperations] History error', { error: error.message });
    res.status(500).json({ error: 'Failed to get history' });
  }
});

router.get('/:id/knowledge', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { id } = req.params;

    const supabase = getSupabaseServer();
    const { data: sources, error } = await supabase
      .from('ai_knowledge_sources')
      .select('id, name, description, source_type, source_url, status, metadata, is_active, updated_at, created_at')
      .eq('organization_id', organizationId)
      .or(`operation_id.eq.${id},operation_id.is.null`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json({ sources: sources || [] });
  } catch (error) {
    logger.error('[aiOperations] Knowledge error', { error: error.message });
    res.status(500).json({ error: 'Failed to get knowledge sources' });
  }
});

export default router;
