import express from 'express';
import { logger } from '../utils/logger.js';
import { verifyAuth } from '../middleware/auth.js';
import { getSupabaseServer } from '../lib/supabase-server.js';
import crypto from 'crypto';

const router = express.Router();

router.post('/chat', verifyAuth, async (req, res) => {
  try {
    const orgId = req.orgId || req.user?.user_metadata?.organization_id;
    const userId = req.user?.id;
    
    if (!orgId || !userId) {
      return res.status(401).json({ error: 'Organization or User ID not found' });
    }

    const supabase = getSupabaseServer();
    const { messages, model = 'wootech-default', stream = false, max_tokens = 2000 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const gatewayUrl = process.env.WOOTECH_AI_BASE_URL || 'http://wootech-ai-gateway:3000/v1';
    const apiKey = process.env.WOOTECH_AI_API_KEY || 'dummy';
    
    // 1. Reserve Credits
    const idempotencyKey = crypto.randomUUID();
    const fingerprint = req.ip || 'unknown';
    const estimatedTokens = max_tokens;

    const { error: reserveError } = await supabase.rpc('wootech_ai_mutate', {
      p_action: 'reserve',
      p_org: orgId,
      p_actor: userId,
      p_key: idempotencyKey,
      p_fingerprint: fingerprint,
      p_amount: estimatedTokens,
      p_reason: `Chat completion reservation for ${model}`
    });

    if (reserveError) {
      logger.error(`[WooTechAI] Reserve Error:`, reserveError);
      if (reserveError.message.includes('AI_INSUFFICIENT_CREDITS')) {
        return res.status(402).json({ error: 'Payment Required', message: 'Saldo de créditos de IA insuficiente.' });
      }
      return res.status(403).json({ error: 'Access Denied', message: 'Acesso negado à API de IA.' });
    }

    logger.info(`[WooTechAI] Forwarding request to ${gatewayUrl}/chat/completions`);

    const payload = {
      model,
      messages,
      stream,
      max_tokens
    };
    
    if (stream) {
      payload.stream_options = { include_usage: true };
    }

    const response = await fetch(`${gatewayUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[WooTechAI] Gateway Error: ${response.status} ${errorText}`);
      
      // Release reservation on failure
      await supabase.rpc('wootech_ai_mutate', {
        p_action: 'release', p_org: orgId, p_actor: userId, p_key: idempotencyKey, p_fingerprint: fingerprint
      });
      
      return res.status(response.status).json({ error: 'Gateway Error' });
    }

    let exactTokens = 0;

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const textChunk = decoder.decode(value, { stream: true });
        
        // Try to parse usage from chunks
        const lines = textChunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.usage && data.usage.total_tokens) {
                exactTokens = data.usage.total_tokens;
              }
            } catch (e) {
              // Ignore parse errors on partial chunks
            }
          }
        }
        res.write(textChunk);
      }
      res.end();
    } else {
      const data = await response.json();
      if (data.usage && data.usage.total_tokens) {
        exactTokens = data.usage.total_tokens;
      }
      res.json(data);
    }

    // 3. Settle Credits
    if (exactTokens > 0) {
      await supabase.rpc('wootech_ai_mutate', {
        p_action: 'settle', p_org: orgId, p_actor: userId, p_key: idempotencyKey, p_fingerprint: fingerprint, p_amount: exactTokens
      });
      logger.info(`[WooTechAI] Settled ${exactTokens} tokens from org ${orgId}`);
    } else {
      // If we couldn't measure, we release to avoid punishing the user, or settle with a default. MVP: release.
      await supabase.rpc('wootech_ai_mutate', {
        p_action: 'release', p_org: orgId, p_actor: userId, p_key: idempotencyKey, p_fingerprint: fingerprint
      });
    }
    
  } catch (error) {
    logger.error('[WooTechAI] Exception caught:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Transfer / Inject Credits
router.post('/transfer', verifyAuth, async (req, res) => {
  try {
    const { targetOrgId, amount, type, reason = 'Administração' } = req.body;
    const orgId = req.orgId || req.user?.user_metadata?.organization_id;
    const userId = req.user?.id;

    if (!targetOrgId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    // Apenas a Woo pode distribuir créditos no momento (MVP)
    if (req.userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Apenas a WooTech pode distribuir créditos no momento.' });
    }

    const supabase = getSupabaseServer();
    const idempotencyKey = crypto.randomUUID();
    const fingerprint = req.ip || 'unknown';

    const { error: grantError } = await supabase.rpc('wootech_ai_mutate', {
      p_action: 'grant',
      p_org: targetOrgId,
      p_actor: userId,
      p_key: idempotencyKey,
      p_fingerprint: fingerprint,
      p_amount: amount,
      p_reason: reason
    });

    if (grantError) {
      logger.error('[WooTechAI Transfer] RPC Error:', grantError);
      return res.status(500).json({ error: 'Falha ao injetar créditos.' });
    }

    return res.json({ success: true, message: 'Créditos processados com sucesso.' });

  } catch (error) {
    logger.error('[WooTechAI Transfer] Exception caught:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
