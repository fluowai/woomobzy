/**
 * Unified Agent Runtime
 * 
 * Orchestrates the full conversation flow:
 * 1. Load conversation state & memory
 * 2. Pre-generation guardrails (loop detection, hallucination risk)
 * 3. Build prompt (using saved agent prompt from DB)
 * 4. Call LLM Provider (streaming or blocking)
 * 5. Execute tools if requested (via PolicyEngine)
 * 6. Post-generation guardrails
 * 7. Save updated state & conversation history
 */

import { getSupabaseServer } from '../../lib/supabase-server.js';
import { logger } from '../../utils/logger.js';
import { getConversationStateManager } from './conversationStateManager.js';
import { ConversationGuard } from './conversationGuard.js';
import { getLLMOrchestrator } from './llmProvider.js';
import { getPolicyEngine } from './toolRegistry.js';

export class AgentRuntime {
  constructor() {
    this.stateManager = getConversationStateManager();
    this.guard = new ConversationGuard();
    this.llmProvider = getLLMOrchestrator();
    this.policyEngine = getPolicyEngine();
  }

  /**
   * Process an incoming message and return the agent's response
   */
  async processMessage({
    organizationId,
    conversationId,
    channel,
    instanceId,
    leadId,
    agentId,
    messageContent,
    mediaUrl = null,
    contextOverrides = {}
  }) {
    const startTime = Date.now();
    const supabase = getSupabaseServer();

    try {
      // 1. Load Agent & Version
      const { data: agent } = await supabase
        .from('ai_agents')
        .select(`
          *,
          ai_agent_versions!ai_agent_versions_agent_id_fkey (
            id, version, prompt, model, model_config, tools, permissions
          )
        `)
        .eq('id', agentId)
        .eq('organization_id', organizationId)
        .single();

      if (!agent) throw new Error('Agent not found');
      
      const activeVersion = agent.ai_agent_versions.find(v => v.id === agent.active_version_id) 
                         || agent.ai_agent_versions[0];
                         
      if (!activeVersion) throw new Error('Agent has no active version');

      // 2. Load Conversation State
      let conversationState = await this.stateManager.getOrCreateState(organizationId, conversationId, channel, instanceId);
      
      if (!conversationState) {
        conversationState = await this.stateManager.initializeState({
          organizationId,
          conversationId,
          channel,
          instanceId,
          leadId,
          agentId
        });
      }

      // Add the user message to history
      await this.stateManager.addMessage(organizationId, conversationId, 'user', messageContent, { mediaUrl });

      // 3. Pre-generation Guardrails
      // We check for sensitive data or loops
      const preGuard = await this.guard.preGenerationCheck(activeVersion, messageContent, conversationState);
      const blocks = preGuard.blocks || [];
      if (blocks.length > 0) {
        // Guard blocked the conversation (e.g. asking for CC)
        logger.warn('[AgentRuntime] Pre-guard blocked generation', { blocks });
        return {
          response: "Desculpe, não posso processar essa solicitação por questões de segurança.",
          status: 'blocked',
          latencyMs: Date.now() - startTime
        };
      }

      // 4. Build Prompt
      const systemPrompt = this._buildSystemPrompt(activeVersion, conversationState);
      const messages = this._buildMessages(systemPrompt, conversationState);
      const tools = await this._loadTools(activeVersion.id, organizationId);

      // 5. Call LLM (with Tool support - ReAct Loop)
      let currentMessages = [...messages];
      let finalResponse = null;
      let toolCallsHistory = [];
      let iterations = 0;
      const MAX_ITERATIONS = 3; // Prevent infinite tool loops

      while (iterations < MAX_ITERATIONS && !finalResponse) {
        iterations++;
        
        const llmConfig = {
          provider: activeVersion.model_config?.provider || 'gemini',
          model: activeVersion.model || 'gemini-1.5-pro-latest',
          temperature: activeVersion.model_config?.temperature || 0.5,
          tools: tools.length > 0 ? tools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.inputSchema || { type: 'object', properties: {} }
          })) : undefined
        };

        const llmResult = await this.llmProvider.chat(currentMessages, 'agent', llmConfig);

        // Check if LLM wants to call tools
        if (llmResult.toolCalls && Object.keys(llmResult.toolCalls).length > 0) {
          currentMessages.push({
            role: 'assistant',
            content: llmResult.content || '',
            tool_calls: llmResult.toolCalls
          });

          // Execute tools sequentially
          for (const [toolCallId, call] of Object.entries(llmResult.toolCalls)) {
            const toolName = call.name || call.function?.name;
            const toolArgs = typeof call.args === 'object' ? call.args : (call.function?.arguments ? JSON.parse(call.function.arguments) : {});
            
            logger.info(`[AgentRuntime] Executing tool ${toolName}`, { args: toolArgs });
            
            const toolContext = {
              organizationId,
              conversationId,
              leadId,
              agentVersionId: activeVersion.id
            };

            const toolResult = await this.policyEngine.executeToolCall(
              activeVersion.id,
              toolName,
              toolArgs,
              toolContext
            );

            toolCallsHistory.push({
              name: toolName,
              status: toolResult.success ? 'success' : 'error',
              arguments: toolArgs,
              result: toolResult
            });

            currentMessages.push({
              role: 'tool',
              tool_call_id: call.id || toolCallId,
              name: toolName,
              content: JSON.stringify(toolResult.success ? toolResult.data : { error: toolResult.error })
            });
          }
        } else {
          // No tools called, we have our final response
          finalResponse = llmResult.content;
          
          currentMessages.push({
            role: 'assistant',
            content: finalResponse
          });
        }
      }

      if (!finalResponse) {
        finalResponse = "Desculpe, tive um problema ao processar sua solicitação.";
      }

      // 6. Post-generation Guardrails (No implementation needed right now, but hook is here)
      // e.g., check if the agent generated sensitive data
      
      // 7. Save State
      await this.stateManager.addMessage(organizationId, conversationId, 'agent', finalResponse, {
        toolCalls: toolCallsHistory
      });
      
      await this.stateManager.persistState(conversationState);

      // Return the final payload
      return {
        response: finalResponse,
        status: 'success',
        toolCalls: toolCallsHistory,
        latencyMs: Date.now() - startTime
      };

    } catch (error) {
      logger.error('[AgentRuntime] Error in processMessage', { error: error.message, stack: error.stack });
      return {
        response: "Ocorreu um erro interno ao processar sua mensagem.",
        status: 'error',
        error: error.message,
        latencyMs: Date.now() - startTime
      };
    }
  }

  _buildSystemPrompt(activeVersion, conversationState) {
    // Determine the base prompt
    let promptBase = '';
    if (activeVersion.prompt && activeVersion.prompt.full) {
      promptBase = activeVersion.prompt.full;
    } else if (activeVersion.prompt && Array.isArray(activeVersion.prompt.blocks)) {
      promptBase = activeVersion.prompt.blocks.map(b => b.content).join('\n\n');
    } else if (typeof activeVersion.prompt === 'string') {
      promptBase = activeVersion.prompt;
    } else {
      promptBase = 'Você é um assistente útil.';
    }

    // Inject context (Lead Data, Short-term memory, etc)
    const contextStr = `
INFORMAÇÕES DE CONTEXTO (Não repita o que já foi perguntado):
- Status da Conversa: ${conversationState.status}
- Dados Conhecidos do Lead: ${JSON.stringify(conversationState.lead_memory || {})}
- Slots Preenchidos: ${JSON.stringify(conversationState.slots || {})}
`;

    return promptBase + '\n\n' + contextStr;
  }

  _buildMessages(systemPrompt, conversationState) {
    const messages = [{ role: 'system', content: systemPrompt }];
    
    // Add history (last 10 messages max to save tokens)
    const history = conversationState.messageHistory || [];
    const recentHistory = history.slice(-10);
    
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    }
    
    return messages;
  }

  async _loadTools(agentVersionId, organizationId) {
    const tools = await this.policyEngine.toolRegistry.getAgentTools(agentVersionId);
    return tools; // Returns array of DB tool definitions mapped to {name, description, inputSchema}
  }
}

// Singleton
let agentRuntimeInstance = null;

export function getAgentRuntime() {
  if (!agentRuntimeInstance) {
    agentRuntimeInstance = new AgentRuntime();
  }
  return agentRuntimeInstance;
}

export default { AgentRuntime, getAgentRuntime };
