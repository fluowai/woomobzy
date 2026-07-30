import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

const PROVIDER_DEFS = {
  groq: { id: 'groq', label: 'Groq', model: 'llama-3.3-70b-versatile', envKey: 'GROQ_API_KEY' },
  gemini: { id: 'gemini', label: 'Gemini', model: 'gemini-2.0-flash', envKey: 'GEMINI_API_KEY' },
  chatgpt: { id: 'chatgpt', label: 'ChatGPT', model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY' },
};

const FALLBACK_ORDER = ['groq', 'gemini', 'chatgpt'];

function isKeyValid(key) {
  if (!key) return false;
  if (key.includes('sk-mock-') || key.includes('mock-key')) return false;
  if (key === 'dummy') return false;
  if (key.length < 8) return false;
  return true;
}

function resolveProvider(model, apiKeys = {}) {
  const defs = {
    groq: { ...PROVIDER_DEFS.groq },
    gemini: { ...PROVIDER_DEFS.gemini },
    chatgpt: { ...PROVIDER_DEFS.chatgpt },
  };

  for (const [id, def] of Object.entries(defs)) {
    const key = apiKeys[id] || process.env[def.envKey] || '';
    def.key = typeof key === 'string' ? key.trim() : '';
  }

  let selected;
  if (!model || model === 'auto/wootech' || model === 'wootech-1') {
    selected = defs.groq;
  } else if (model === 'wootech-2') {
    selected = defs.gemini;
  } else if (model === 'wootech-3') {
    selected = defs.chatgpt;
  } else {
    selected = Object.values(defs).find((d) => d.id === model || d.label === model) || defs.groq;
  }

  return { selected, all: defs };
}

async function tryGroq(messages, provider) {
  if (!isKeyValid(provider.key)) {
    throw new Error(`${provider.label}: API key não configurada`);
  }

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        stream: false,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `${provider.label} ${response.status}: ${errorText.substring(0, 300)}`
    );
  }

  return response.json();
}

async function tryGemini(messages, provider) {
  if (!isKeyValid(provider.key)) {
    throw new Error(`${provider.label}: API key não configurada`);
  }

  const geminiContents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: geminiContents }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `${provider.label} ${response.status}: ${errorText.substring(0, 300)}`
    );
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    choices: [{ message: { role: 'assistant', content: text }, index: 0 }],
  };
}

async function tryChatGPT(messages, provider) {
  if (!isKeyValid(provider.key)) {
    throw new Error(`${provider.label}: API key não configurada`);
  }

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        stream: false,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `${provider.label} ${response.status}: ${errorText.substring(0, 300)}`
    );
  }

  return response.json();
}

const PROVIDER_FN = {
  groq: tryGroq,
  gemini: tryGemini,
  chatgpt: tryChatGPT,
};

router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'wootech-1', stream = false, apiKeys = {} } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (stream) {
      return res
        .status(400)
        .json({ error: 'Streaming not supported via fallback' });
    }

    const { selected: primary, all: providers } = resolveProvider(model, apiKeys);
    const triedProviders = [primary.id];

    try {
      const fn = PROVIDER_FN[primary.id];
      const data = await fn(messages, primary);
      logger.info(`[WooTechAI] ${primary.label} respondeu com sucesso`);
      return res.json(data);
    } catch (primaryError) {
      logger.warn(`[WooTechAI] ${primary.label} falhou: ${primaryError.message}`);
    }

    const errors = [];
    for (const fallbackId of FALLBACK_ORDER) {
      if (triedProviders.includes(fallbackId)) continue;
      triedProviders.push(fallbackId);

      const provider = providers[fallbackId];
      const fn = PROVIDER_FN[fallbackId];

      try {
        const data = await fn(messages, provider);
        logger.info(`[WooTechAI] ${provider.label} respondeu (fallback)`);
        return res.json(data);
      } catch (providerError) {
        errors.push(providerError.message);
        logger.warn(`[WooTechAI] ${provider.label} falhou: ${providerError.message}`);
      }
    }

    return res.status(503).json({
      error: 'Nenhum provedor de IA disponível no momento.',
      details: errors,
    });
  } catch (error) {
    logger.error('[WooTechAI] Exception caught:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
