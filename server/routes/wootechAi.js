import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

async function tryOmniRoute(messages, model) {
  const gatewayUrl =
    process.env.AI_GATEWAY_URL || 'http://omniroute:20128/v1';
  const apiKey = process.env.OMNIROUTE_API_KEY || 'dummy';

  logger.info(`[WooTechAI] Trying OmniRoute at ${gatewayUrl}/chat/completions`);

  const response = await fetch(`${gatewayUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: false }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OmniRoute ${response.status}: ${errorText.substring(0, 300)}`);
  }

  return response.json();
}

async function tryPollinations(messages) {
  logger.info('[WooTechAI] Trying Pollinations fallback');

  const response = await fetch(
    'https://text.pollinations.ai/openai/chat/completions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
        messages,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pollinations ${response.status}: ${errorText.substring(0, 300)}`);
  }

  return response.json();
}

async function tryOpenRouter(messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OpenRouter: no API key configured');

  logger.info('[WooTechAI] Trying OpenRouter fallback');

  const response = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errorText.substring(0, 300)}`);
  }

  return response.json();
}

async function tryGemini(messages) {
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!geminiKey || geminiKey.includes('YOUR_') || geminiKey.length < 20) {
    throw new Error('Gemini: no valid API key configured');
  }

  logger.info('[WooTechAI] Trying Gemini fallback');

  const geminiContents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: geminiContents }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini ${response.status}: ${errorText.substring(0, 300)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    choices: [
      {
        message: { role: 'assistant', content: text },
        index: 0,
      },
    ],
  };
}

router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'auto/wootech', stream = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (stream) {
      return res.status(400).json({ error: 'Streaming not supported via fallback' });
    }

    // Try OmniRoute first
    try {
      const data = await tryOmniRoute(messages, model);
      return res.json(data);
    } catch (gatewayError) {
      logger.warn(`[WooTechAI] OmniRoute failed: ${gatewayError.message}`);
    }

    // Fallback providers (OpenAI-compatible first)
    const errors = [];
    for (const attempt of [tryPollinations, tryOpenRouter, tryGemini]) {
      try {
        const data = await attempt(messages);
        logger.info(`[WooTechAI] Fallback ${attempt.name} succeeded`);
        return res.json(data);
      } catch (providerError) {
        errors.push(providerError.message);
        logger.warn(`[WooTechAI] ${attempt.name} failed: ${providerError.message}`);
      }
    }

    return res.status(503).json({
      error: 'Todos os provedores de IA estao indisponiveis.',
      details: errors,
    });
  } catch (error) {
    logger.error('[WooTechAI] Exception caught:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
