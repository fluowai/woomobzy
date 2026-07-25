import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'auto/wootech', stream = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const gatewayUrl = process.env.AI_GATEWAY_URL || 'http://omniroute:20128/v1';
    const apiKey = process.env.OMNIROUTE_API_KEY || 'dummy';

    logger.info(`[WooTechAI] Forwarding request to ${gatewayUrl}/chat/completions`);

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
      logger.error(`[WooTechAI] Gateway Error: ${response.status} ${errorText}`);
      return res.status(response.status).json({ error: errorText });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      const data = await response.json();
      return res.json(data);
    }
  } catch (error) {
    logger.error('[WooTechAI] Exception caught:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
