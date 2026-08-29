import express from 'express';
import { logger } from '../utils/logger.js';
import { verifyAuth } from '../middleware/auth.js';
import { getSupabaseServer } from '../lib/supabase-server.js';

const router = express.Router();

router.post('/chat', verifyAuth, async (req, res) => {
  try {
    const orgId = req.orgId || req.user?.user_metadata?.organization_id;
    if (!orgId) {
      return res.status(401).json({ error: 'Organization ID not found' });
    }

    const supabase = getSupabaseServer();

    // 1. Check AI Credits
    const { data: balanceData } = await supabase
      .from('ai_balances')
      .select('balance_tokens')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!balanceData || balanceData.balance_tokens <= 0) {
      return res.status(402).json({ 
        error: 'Payment Required', 
        message: 'Seu saldo de créditos de IA acabou. Adicione mais créditos para continuar.' 
      });
    }

    const { messages, model = 'auto/wootech', stream = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const gatewayUrl =
      process.env.AI_GATEWAY_URL || 'http://omniroute:20128/v1';
    const apiKey = process.env.OMNIROUTE_API_KEY || 'dummy';

    logger.info(
      `[WooTechAI] Forwarding request to ${gatewayUrl}/chat/completions`
    );

    const response = await fetch(`${gatewayUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        `[WooTechAI] Gateway Error: ${response.status} ${errorText}`
      );
      return res.status(response.status).json({ error: errorText });
    }

    let totalChars = JSON.stringify(messages).length;

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
        totalChars += textChunk.length;
        res.write(textChunk);
      }
      res.end();
    } else {
      const data = await response.json();
      totalChars += JSON.stringify(data).length;
      res.json(data);
    }

    // 3. Deduct AI Credits (Estimate: ~4 chars per token)
    const estimatedTokens = Math.ceil(totalChars / 4);
    if (estimatedTokens > 0) {
      await supabase.from('ai_ledgers').insert({
        organization_id: orgId,
        amount: -estimatedTokens,
        transaction_type: 'consume',
        description: `Chat completions usage (${model})`,
      });
      logger.info(`[WooTechAI] Deducted ${estimatedTokens} tokens from org ${orgId}`);
    }
    
  } catch (error) {
    logger.error('[WooTechAI] Exception caught:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Transfer / Inject Credits
router.post('/transfer', verifyAuth, async (req, res) => {
  try {
    const { targetOrgId, amount, type } = req.body; // type: 'recharge' or 'transfer'
    const orgId = req.orgId || req.user?.user_metadata?.organization_id;

    if (!targetOrgId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    const supabase = getSupabaseServer();

    // Se for MEGA ADMIN (recharge), ele pode injetar do nada
    if (type === 'recharge' && req.userRole === 'superadmin') {
      await supabase.from('ai_ledgers').insert({
        organization_id: targetOrgId,
        amount: amount,
        transaction_type: 'recharge',
        description: 'Recarga administrativa (Mega Admin)',
      });
      return res.json({ success: true, message: 'Créditos injetados com sucesso.' });
    }

    // Se for TRANSFERÊNCIA (Reseller -> Cliente ou MegaAdmin -> Cliente)
    // 1. Checar saldo de quem envia
    const { data: balanceData } = await supabase
      .from('ai_balances')
      .select('balance_tokens')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!balanceData || balanceData.balance_tokens < amount) {
      return res.status(400).json({ error: 'Saldo insuficiente para transferência.' });
    }

    // 2. Transação dupla
    await supabase.from('ai_ledgers').insert([
      {
        organization_id: orgId,
        amount: -amount,
        transaction_type: 'transfer_out',
        description: `Transferência para org ${targetOrgId}`,
      },
      {
        organization_id: targetOrgId,
        amount: amount,
        transaction_type: 'transfer_in',
        description: `Transferência recebida da org ${orgId}`,
      }
    ]);

    return res.json({ success: true, message: 'Transferência realizada com sucesso.' });

  } catch (error) {
    logger.error('[WooTechAI Transfer] Exception caught:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
