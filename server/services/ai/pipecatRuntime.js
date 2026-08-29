import { toolGateway } from './toolGateway.js';
import { llmRouter } from './llmRouter.js';
import { eventBus, EVENTS } from '../../lib/eventBus.js';

/**
 * Wootech AI Voz - Pipecat Runtime Abstraction
 * This acts as the translation layer between the Pipecat WebSocket connection
 * (streaming audio, VAD) and our internal LLM Router & Tool Gateway.
 */
class PipecatRuntime {
  constructor() {
    this.activeSessions = new Map();
  }

  /**
   * Initializes a conversational session for an agent.
   */
  async startSession(tenantId, agentId, connectionData) {
    const sessionId = crypto.randomUUID();
    console.log(`[Pipecat] Starting session ${sessionId} for agent ${agentId} (Tenant: ${tenantId})`);

    // In a real implementation, this sets up the WebRTC/WebSocket to the Pipecat container
    this.activeSessions.set(sessionId, {
      tenantId,
      agentId,
      connectionData,
      status: 'active',
      history: []
    });

    eventBus.publish(EVENTS.VOICE.STARTED, {
      tenant_id: tenantId,
      agent_id: agentId,
      session_id: sessionId
    });

    return sessionId;
  }

  /**
   * Processes an incoming text chunk (already transcribed by STT within Pipecat).
   * This sends the text to the LLM, parses any tool calls, executes them, and returns text for TTS.
   */
  async processAudioInput(sessionId, transcribedText) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    console.log(`[Pipecat] User: "${transcribedText}"`);
    
    // Add to local context
    session.history.push({ role: 'user', content: transcribedText });

    // In a real app, you would fetch agent config (model, prompt) from DB here
    const preferredProvider = 'openai'; 
    const model = 'gpt-4o';
    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_properties',
          description: 'Search properties',
          parameters: { type: 'object', properties: { city: { type: 'string' } } }
        }
      }
    ];

    try {
      const response = await llmRouter.routeChatCompletion(
        session.tenantId, 
        preferredProvider, 
        model, 
        session.history, 
        { tools }
      );

      const aiMessage = response.response.choices[0].message;
      
      // Handle Tool Calls if any
      if (aiMessage.tool_calls) {
        for (const toolCall of aiMessage.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);
          console.log(`[Pipecat] LLM requested tool: ${toolCall.function.name}`);
          
          // Execute via Gateway
          const toolResult = await toolGateway.executeTool(
            session.tenantId, 
            session.agentId, 
            toolCall.function.name, 
            args
          );
          
          // Append tool result to history
          session.history.push(aiMessage);
          session.history.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        }
        
        // Second pass after tool execution
        return this.processAudioInput(sessionId, 'Here are the results. Tell me about them.');
      }

      // No tools, just text
      session.history.push(aiMessage);
      console.log(`[Pipecat] AI: "${aiMessage.content}"`);
      
      return aiMessage.content; // Goes to TTS engine
      
    } catch (err) {
      console.error('[Pipecat] Error processing audio input:', err);
      return "Estou enfrentando problemas técnicos, um momento por favor.";
    }
  }

  async endSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      eventBus.publish(EVENTS.VOICE.COMPLETED, {
        tenant_id: session.tenantId,
        session_id: sessionId,
        history_length: session.history.length
      });
      this.activeSessions.delete(sessionId);
    }
  }
}

export const pipecatRuntime = new PipecatRuntime();
