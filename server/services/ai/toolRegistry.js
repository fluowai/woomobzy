/**
 * Tool Registry - Centralized Tool Definitions
 * 
 * Manages all available tools, their schemas, handlers, and permissions.
 * Provides lookup, validation, and execution interface.
 */

import { getSupabaseServer } from '../../lib/supabase-server.js';
import { logger } from '../../utils/logger.js';

// ============================================================
// TOOL REGISTRY CLASS
// ============================================================

export class ToolRegistry {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all active tools for an organization (global + tenant-specific)
   */
  async getToolsForOrganization(organizationId) {
    const cacheKey = `tools_${organizationId}`;
    const now = Date.now();
    
    if (this.cache.has(cacheKey) && this.cacheExpiry.get(cacheKey) > now) {
      return this.cache.get(cacheKey);
    }

    const supabase = getSupabaseServer();
    
    // Get global tools (organization_id IS NULL) + tenant tools
    const { data: tools, error } = await supabase
      .from('ai_tools')
      .select('*')
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      logger.error('[ToolRegistry] Failed to fetch tools', { error: error.message, organizationId });
      throw new Error('Failed to load tool registry');
    }

    const formatted = tools?.map(t => ({
      id: t.id,
      name: t.name,
      displayName: t.display_name,
      category: t.category,
      description: t.description,
      inputSchema: t.input_schema,
      outputSchema: t.output_schema,
      handlerType: t.handler_type,
      handlerConfig: t.handler_config,
      requiresApproval: t.requires_approval
    })) || [];

    this.cache.set(cacheKey, formatted);
    this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);
    
    return formatted;
  }

  /**
   * Get tool by name for organization
   */
  async getTool(organizationId, toolName) {
    const tools = await this.getToolsForOrganization(organizationId);
    return tools.find(t => t.name === toolName);
  }

  /**
   * Get tools by category
   */
  async getToolsByCategory(organizationId, category) {
    const tools = await this.getToolsForOrganization(organizationId);
    return tools.filter(t => t.category === category);
  }

  /**
   * Get tools authorized for a specific agent version
   */
  async getAgentTools(agentVersionId) {
    const supabase = getSupabaseServer();
    
    const { data, error } = await supabase
      .from('ai_agent_tools')
      .select(`
        config_override,
        ai_tools (
          id, name, display_name, category, description,
          input_schema, output_schema, handler_type, handler_config, requires_approval
        )
      `)
      .eq('agent_version_id', agentVersionId);

    if (error) {
      logger.error('[ToolRegistry] Failed to fetch agent tools', { error: error.message, agentVersionId });
      throw new Error('Failed to load agent tools');
    }

    return data?.map(item => ({
      ...item.ai_tools,
      configOverride: item.config_override
    })) || [];
  }

  /**
   * Validate tool input against schema
   */
  validateInput(tool, input) {
    const schema = tool.inputSchema;
    if (!schema) return { valid: true };
    
    // Basic validation - in production use a JSON Schema validator like ajv
    const required = schema.required || [];
    for (const field of required) {
      if (!(field in input)) {
        return { valid: false, error: `Campo obrigatório ausente: ${field}` };
      }
    }
    
    // Type checking for properties
    if (schema.properties) {
      for (const [key, value] of Object.entries(input)) {
        const propSchema = schema.properties[key];
        if (propSchema && propSchema.type) {
          const expectedType = propSchema.type;
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          
          if (expectedType === 'number' && actualType !== 'number') {
            return { valid: false, error: `Campo ${key} deve ser número` };
          }
          if (expectedType === 'string' && actualType !== 'string') {
            return { valid: false, error: `Campo ${key} deve ser string` };
          }
          if (expectedType === 'boolean' && actualType !== 'boolean') {
            return { valid: false, error: `Campo ${key} deve ser booleano` };
          }
          if (expectedType === 'array' && actualType !== 'array') {
            return { valid: false, error: `Campo ${key} deve ser array` };
          }
        }
      }
    }
    
    return { valid: true };
  }

  /**
   * Clear cache (call after tool updates)
   */
  clearCache(organizationId = null) {
    if (organizationId) {
      this.cache.delete(`tools_${organizationId}`);
      this.cacheExpiry.delete(`tools_${organizationId}`);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }
}

// Singleton
let toolRegistryInstance = null;

export function getToolRegistry() {
  if (!toolRegistryInstance) {
    toolRegistryInstance = new ToolRegistry();
  }
  return toolRegistryInstance;
}

// ============================================================
// POLICY ENGINE - Security Layer between LLM and Tools
// ============================================================

export class PolicyEngine {
  constructor(toolRegistry = null) {
    this.toolRegistry = toolRegistry || getToolRegistry();
    this.rateLimits = new Map(); // tool -> { count, windowStart }
    this.RATE_LIMIT_WINDOW = 60000; // 1 minute
    this.DEFAULT_RATE_LIMIT = 30; // per minute per agent
  }

  /**
   * Main entry point - validates and executes tool call
   */
  async executeToolCall(agentVersionId, toolName, input, context = {}) {
    const startTime = Date.now();
    const { organizationId, conversationId, leadId } = context;
    
    try {
      // 1. Get agent's authorized tools
      const agentTools = await this.toolRegistry.getAgentTools(agentVersionId);
      const tool = agentTools.find(t => t.name === toolName);
      
      if (!tool) {
        return this.auditAndReturn({
          success: false,
          error: `Tool '${toolName}' not authorized for this agent`,
          code: 'TOOL_NOT_AUTHORIZED',
          executionTimeMs: Date.now() - startTime
        }, { agentVersionId, toolName, input, organizationId });
      }

      // 2. Validate input schema
      const validation = this.toolRegistry.validateInput(tool, input);
      if (!validation.valid) {
        return this.auditAndReturn({
          success: false,
          error: validation.error,
          code: 'INVALID_INPUT',
          executionTimeMs: Date.now() - startTime
        }, { agentVersionId, toolName, input, organizationId });
      }

      // 3. Check rate limits
      const rateLimitCheck = this.checkRateLimit(agentVersionId, toolName);
      if (!rateLimitCheck.allowed) {
        return this.auditAndReturn({
          success: false,
          error: `Rate limit exceeded for ${toolName}`,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitCheck.retryAfter,
          executionTimeMs: Date.now() - startTime
        }, { agentVersionId, toolName, input, organizationId });
      }

      // 4. Check approval requirement
      if (tool.requiresApproval && !context.approved) {
        return this.auditAndReturn({
          success: false,
          error: 'Tool requires human approval',
          code: 'APPROVAL_REQUIRED',
          requiresApproval: true,
          executionTimeMs: Date.now() - startTime
        }, { agentVersionId, toolName, input, organizationId });
      }

      // 5. Execute tool based on handler type
      const result = await this.executeHandler(tool, input, context);
      
      // 6. Record successful execution for rate limiting
      this.recordExecution(agentVersionId, toolName);
      
      return this.auditAndReturn({
        success: true,
        data: result,
        executionTimeMs: Date.now() - startTime
      }, { agentVersionId, toolName, input, organizationId, conversationId, leadId });

    } catch (error) {
      logger.error('[PolicyEngine] Tool execution error', { 
        error: error.message, 
        agentVersionId, 
        toolName 
      });
      
      return this.auditAndReturn({
        success: false,
        error: error.message,
        code: 'EXECUTION_ERROR',
        executionTimeMs: Date.now() - startTime
      }, { agentVersionId, toolName, input, organizationId });
    }
  }

  /**
   * Execute tool handler based on type
   */
  async executeHandler(tool, input, context) {
    const { handlerType, handlerConfig } = tool;
    const { organizationId, conversationId, leadId } = context;
    const supabase = getSupabaseServer();

    switch (handlerType) {
      case 'SUPABASE_RPC':
        return await this.executeSupabaseRpc(handlerConfig.function, input, organizationId);
      
      case 'SUPABASE_QUERY':
        return await this.executeSupabaseQuery(handlerConfig, input, organizationId);
      
      case 'INTERNAL_FUNCTION':
        return await this.executeInternalFunction(handlerConfig.handler, input, context);
      
      case 'HTTP_WEBHOOK':
        return await this.executeWebhook(handlerConfig, input, context);
      
      case 'EXTERNAL_API':
        return await this.executeExternalApi(handlerConfig, input, context);
      
      default:
        throw new Error(`Unknown handler type: ${handlerType}`);
    }
  }

  async executeSupabaseRpc(functionName, input, organizationId) {
    const supabase = getSupabaseServer();
    
    // Add organization_id to input if not present
    const rpcInput = { ...input, organization_id: organizationId };
    
    const { data, error } = await supabase.rpc(functionName, rpcInput);
    
    if (error) {
      throw new Error(`RPC ${functionName} failed: ${error.message}`);
    }
    
    return data;
  }

  async executeSupabaseQuery(config, input, organizationId) {
    const supabase = getSupabaseServer();
    const { table, select, filters = {}, limit = 10 } = config;
    
    let query = supabase.from(table).select(select || '*');
    
    // Apply organization filter
    query = query.eq('organization_id', organizationId);
    
    // Apply additional filters
    for (const [key, value] of Object.entries(filters)) {
      const inputValue = input[key];
      if (inputValue !== undefined) {
        query = query.eq(key, inputValue);
      }
    }
    
    query = query.limit(limit);
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
    
    return { results: data };
  }

  async executeInternalFunction(handlerName, input, context) {
    // Import handlers dynamically
    const { 
      simulateFinancing, 
      sendMessage, 
      matchLeadProperties,
      calculateLeadScore,
      generateDocument,
      extractDocumentText
    } = await import('./toolHandlers.js');
    
    const handlers = {
      simulate_financing: simulateFinancing,
      send_message: sendMessage,
      match_lead_properties: matchLeadProperties,
      calculate_lead_score: calculateLeadScore,
      generate_document: generateDocument,
      extract_document_text: extractDocumentText
    };
    
    const handler = handlers[handlerName];
    if (!handler) {
      throw new Error(`Internal handler not found: ${handlerName}`);
    }
    
    return await handler(input, context);
  }

  async executeWebhook(config, input, context) {
    const { url, method = 'POST', headers = {}, timeout = 10000 } = config;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({ ...input, context }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${await response.text()}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Webhook timeout');
      }
      throw error;
    }
  }

  async executeExternalApi(config, input, context) {
    const { provider, endpoint, apiKey } = config;
    
    // Provider-specific implementations
    switch (provider) {
      case 'elevenlabs':
        return await this.callElevenLabs(endpoint, input, apiKey);
      case 'openai':
        return await this.callOpenAI(endpoint, input, apiKey);
      default:
        throw new Error(`External API provider not supported: ${provider}`);
    }
  }

  async callElevenLabs(endpoint, input, apiKey) {
    const response = await fetch(`https://api.elevenlabs.io/v1${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify(input)
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }
    
    return await response.json();
  }

  async callOpenAI(endpoint, input, apiKey) {
    const response = await fetch(`https://api.openai.com/v1${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(input)
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Rate limiting per agent per tool
   */
  checkRateLimit(agentVersionId, toolName) {
    const key = `${agentVersionId}:${toolName}`;
    const now = Date.now();
    const record = this.rateLimits.get(key);
    
    if (!record || now - record.windowStart > this.RATE_LIMIT_WINDOW) {
      this.rateLimits.set(key, { count: 1, windowStart: now });
      return { allowed: true };
    }
    
    const limit = this.DEFAULT_RATE_LIMIT;
    if (record.count >= limit) {
      return { 
        allowed: false, 
        retryAfter: this.RATE_LIMIT_WINDOW - (now - record.windowStart) 
      };
    }
    
    record.count++;
    return { allowed: true };
  }

  recordExecution(agentVersionId, toolName) {
    const key = `${agentVersionId}:${toolName}`;
    const record = this.rateLimits.get(key);
    if (record) {
      record.count++;
    }
  }

  /**
   * Audit logging for all tool executions
   */
  async auditAndReturn(result, context) {
    const supabase = getSupabaseServer();
    
    // Log to execution logs (async, don't await)
    supabase.from('ai_execution_logs').insert({
      tenant_id: context.organizationId,
      agent_id: context.agentVersionId, // Will be resolved to agent_id via version
      event_type: 'TOOL_EXECUTION',
      channel: context.channel,
      instance_id: context.instanceId,
      conversation_id: context.conversationId,
      lead_id: context.leadId,
      input_json: context.input,
      output_json: result,
      status: result.success ? 'success' : 'failed',
      error_message: result.error,
      executed_at: new Date().toISOString()
    }).then(({ error }) => {
      if (error) logger.error('[PolicyEngine] Failed to log execution', { error: error.message });
    }).catch(e => logger.error('[PolicyEngine] Audit log error', { error: e.message }));
    
    return result;
  }
}

// Singleton
let policyEngineInstance = null;

export function getPolicyEngine() {
  if (!policyEngineInstance) {
    policyEngineInstance = new PolicyEngine();
  }
  return policyEngineInstance;
}

export default { ToolRegistry, PolicyEngine };