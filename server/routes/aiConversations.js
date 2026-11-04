import { Router } from 'express';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { logger } from '../utils/logger.js';
import { getAgentRuntime } from '../services/ai/agentRuntime.js';

const router = Router();

// Endpoint for Sandbox Chat (Real Agent Execution)
router.post('/:conversationId/message', async (req, res) => {
  const { conversationId } = req.params;
  const { message, agentId } = req.body;
  const organizationId = req.tenant?.id; // Assuming requireTenant middleware
  
  if (!organizationId) {
    return res.status(401).json({ error: 'Organization context required' });
  }
  
  if (!message || !agentId) {
    return res.status(400).json({ error: 'message and agentId are required' });
  }

  try {
    const runtime = getAgentRuntime();
    
    // Process message through the full runtime
    const result = await runtime.processMessage({
      organizationId,
      conversationId,
      channel: 'sandbox',
      instanceId: null, // Sandbox has no instance
      leadId: null,     // Sandbox is stateless lead by default, or could pass a test lead_id
      agentId,
      messageContent: message
    });
    
    return res.json({
      response: result.response,
      status: result.status,
      toolCalls: (result.toolCalls || []).map(t => t.name),
      latencyMs: result.latencyMs,
      usage: {
        latency: result.latencyMs
      }
    });
  } catch (error) {
    logger.error('[AIConversations] Error processing message:', error);
    
    // Check if it's an API Key error
    if (error.message && (error.message.includes('Nenhum provedor') || error.message.includes('API_KEY_INVALID') || error.message.includes('401'))) {
      return res.status(400).json({ 
        error: 'Chave LLM inválida ou não configurada.',
        details: error.message 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message 
    });
  }
});

export default router;
