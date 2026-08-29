import { getSupabaseServer } from '../../lib/supabase-server.js';
import { eventBus, EVENTS } from '../../lib/eventBus.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Wootech Tool Gateway
 * Sits between the Pipecat Voice Agent and the Imobzy Monolith APIs/DB.
 * Validates permissions, isolates tenants, and routes LLM tool executions safely.
 */
class WootechToolGateway {
  constructor() {
    this.registry = new Map();
    this.registerDefaultTools();
  }

  /**
   * Registers a tool that an AI Agent can execute.
   */
  registerTool(name, schema, executor) {
    this.registry.set(name, { schema, executor });
    console.log(`[ToolGateway] Registered tool: ${name}`);
  }

  /**
   * Executes a tool invoked by the LLM.
   * @param {string} tenantId - The authorized tenant (resolved by backend, NOT frontend)
   * @param {string} agentId - The ID of the agent calling the tool
   * @param {string} toolName - Name of the tool
   * @param {object} args - Parameters extracted by the LLM
   */
  async executeTool(tenantId, agentId, toolName, args) {
    console.log(`[ToolGateway] Agent ${agentId} executing ${toolName} for tenant ${tenantId}`);
    
    // 1. Validate tool exists
    const tool = this.registry.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found in gateway registry.`);
    }

    // 2. Validate Agent Permissions (RBAC for Tools)
    const supabase = getSupabaseServer();
    const { data: permission, error } = await supabase
      .from('voice_agent_tools')
      .select('is_enabled')
      .eq('agent_id', agentId)
      .eq('tool_name', toolName)
      .single();

    if (error || !permission || !permission.is_enabled) {
      console.error(`[ToolGateway] Unauthorized tool execution attempt: ${toolName} by agent ${agentId}`);
      throw new Error(`Agent is not authorized to execute ${toolName}.`);
    }

    // 3. Execute with Safe Context
    try {
      // In future phases, we inject a Supabase client that bypasses RLS safely 
      // but is scoped heavily by tenantId, or we use service role and enforce tenantId in every query.
      const result = await tool.executor({ tenantId, args, supabase });
      
      // Emit event if successful execution modifies state (handled within tools ideally)
      return result;
    } catch (err) {
      console.error(`[ToolGateway] Error executing ${toolName}:`, err);
      throw err;
    }
  }

  // --- Default Tool Implementations ---
  registerDefaultTools() {
    this.registerTool(
      'search_properties',
      {
        description: 'Searches for properties in the CRM.',
        parameters: {
          type: 'object',
          properties: {
            city: { type: 'string' },
            maxPrice: { type: 'number' },
            bedrooms: { type: 'number' }
          }
        }
      },
      async ({ tenantId, args, supabase }) => {
        // Query CRM database
        let query = supabase
          .from('properties')
          .select('id, title, city, price, bedrooms')
          .eq('organization_id', tenantId)
          .eq('status', 'active')
          .limit(5);

        if (args.city) query = query.ilike('city', `%${args.city}%`);
        if (args.maxPrice) query = query.lte('price', args.maxPrice);
        if (args.bedrooms) query = query.gte('bedrooms', args.bedrooms);

        const { data, error } = await query;
        if (error) throw error;
        
        eventBus.publish(EVENTS.PROPERTY.VIEWED, { tenant_id: tenantId, query: args, results_count: data?.length || 0 });
        return data || [];
      }
    );

    this.registerTool(
      'create_lead',
      {
        description: 'Creates a new lead in the CRM.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' }
          },
          required: ['name', 'phone']
        }
      },
      async ({ tenantId, args, supabase }) => {
        const lead = {
          organization_id: tenantId,
          name: args.name,
          phone: args.phone,
          email: args.email,
          source: 'Wootech AI Voz'
        };

        const { data, error } = await supabase.from('leads').insert(lead).select().single();
        if (error) throw error;

        eventBus.publish(EVENTS.LEAD.CREATED, { tenant_id: tenantId, lead_id: data.id });
        return { success: true, lead_id: data.id };
      }
    );
  }
}

export const toolGateway = new WootechToolGateway();
