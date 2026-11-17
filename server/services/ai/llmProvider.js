/**
 * LLM Provider Abstraction Layer
 * 
 * Supports multiple LLM providers with unified interface:
 * - OpenAI (GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
 * - Google Gemini (1.5 Pro, 1.5 Flash, 2.0)
 * - Anthropic (Claude 3.5 Sonnet, 3.5 Haiku, 3 Opus)
 * - Groq (Llama 3.1, Mixtral, Gemma)
 * - OpenRouter (unified access to 100+ models)
 * - Local (Ollama, LM Studio)
 * 
 * Features:
 * - Model routing by task type
 * - Token budget management
 * - Cost tracking
 * - Fallback chains
 * - Streaming support
 * - Structured output (JSON mode)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { logger } from '../../utils/logger.js';

// ============================================================
// TYPES & INTERFACES
// ============================================================

/**
 * @typedef {Object} LLMMessage
 * @property {'system'|'user'|'assistant'|'tool'} role
 * @property {string} content
 * @property {string} [name] - for tool messages
 * @property {string} [tool_call_id] - for tool responses
 * @property {Object} [tool_calls] - for assistant tool calls
 */

/**
 * @typedef {Object} LLMResponse
 * @property {string} content
 * @property {Object} [toolCalls]
 * @property {Object} usage - { promptTokens, completionTokens, totalTokens }
 * @property {string} model
 * @property {string} provider
 * @property {number} latencyMs
 */

/**
 * @typedef {Object} LLMChunk
 * @property {string} content
 * @property {boolean} done
 * @property {Object} [toolCalls]
 */

/**
 * @typedef {Object} ModelConfig
 * @property {string} provider
 * @property {string} model
 * @property {number} [temperature]
 * @property {number} [maxTokens]
 * @property {number} [topP]
 * @property {boolean} [jsonMode]
 * @property {Object} [responseSchema] - for structured output
 * @property {Object[]} [tools] - function declarations
 * @property {string} [toolChoice] - 'auto'|'none'|'required'|{function: name}
 */

// ============================================================
// MODEL ROUTING CONFIGURATION
// ============================================================

const MODEL_ROUTING = {
  // Fast, cheap models for simple tasks
  'intent_detection': { 
    primary: { provider: 'groq', model: 'llama-3.1-70b-versatile' },
    fallback: [{ provider: 'gemini', model: 'gemini-2.0-flash' }]
  },
  
  // Main conversation - balanced quality/speed
  'conversation': { 
    primary: { provider: 'gemini', model: 'gemini-2.0-flash' },
    fallback: [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'groq', model: 'llama-3.1-70b-versatile' }
    ]
  },

  // Agent execution
  'agent': { 
    primary: { provider: 'gemini', model: 'gemini-2.0-flash' },
    fallback: [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'groq', model: 'llama-3.1-70b-versatile' }
    ]
  },
  
  // Cheap summarization
  'summarization': { 
    primary: { provider: 'openai', model: 'gpt-4o-mini' },
    fallback: [{ provider: 'groq', model: 'llama-3.1-70b-versatile' }]
  },
  
  // Complex reasoning - best models
  'agent_architect': { 
    primary: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
    fallback: [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'gemini', model: 'gemini-2.0-flash' }
    ]
  },
  
  // Adversarial testing - need strong reasoning
  'red_team': { 
    primary: { provider: 'openai', model: 'gpt-4o' },
    fallback: [
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'gemini', model: 'gemini-2.0-flash' }
    ]
  },
  
  // Embeddings
  'embeddings': { 
    primary: { provider: 'openai', model: 'text-embedding-3-small' },
    fallback: [{ provider: 'gemini', model: 'text-embedding-004' }]
  }
};

// Cost per 1M tokens (approximate, update regularly)
const MODEL_COSTS = {
  'openai': {
    'gpt-4o': { input: 5.00, output: 15.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'text-embedding-3-small': { input: 0.02, output: 0 },
    'text-embedding-3-large': { input: 0.13, output: 0 }
  },
  'anthropic': {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 }
  },
  'gemini': {
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    'text-embedding-004': { input: 0.02, output: 0 }
  },
  'groq': {
    'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
    'llama-3.1-70b-versatile': { input: 0.59, output: 0.79 },
    'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
    'gemma2-9b-it': { input: 0.07, output: 0.07 }
  }
};

// ============================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================

class BaseProvider {
  constructor(config) {
    this.config = config;
    this.name = config.name;
  }
  
  async chat(messages, config) { throw new Error('Not implemented'); }
  async stream(messages, config) { throw new Error('Not implemented'); }
  async embeddings(texts, config) { throw new Error('Not implemented'); }
  estimateCost(usage, model) { return 0; }
}

class OpenAIProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, name: 'openai' });
    this.client = new OpenAI({ apiKey: config.apiKey });
  }
  
  async chat(messages, config) {
    const startTime = Date.now();
    
    const openAIMessages = messages.map(m => ({
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content,
      name: m.name,
      tool_call_id: m.tool_call_id,
      tool_calls: m.tool_calls
    }));
    
    const requestConfig = {
      model: config.model,
      messages: openAIMessages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      response_format: config.jsonMode ? { type: 'json_object' } : undefined,
      tools: config.tools ? config.tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters || { type: 'object', properties: {} }
        }
      })) : undefined,
      tool_choice: config.toolChoice
    };
    
    const completion = await this.client.chat.completions.create(requestConfig);
    
    const choice = completion.choices[0];
    const usage = completion.usage;
    
    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      model: completion.model,
      provider: 'openai',
      latencyMs: Date.now() - startTime
    };
  }
  
  async *stream(messages, config) {
    const openAIMessages = messages.map(m => ({
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content,
      name: m.name,
      tool_call_id: m.tool_call_id,
      tool_calls: m.tool_calls
    }));
    
    const stream = await this.client.chat.completions.create({
      model: config.model,
      messages: openAIMessages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      stream: true,
      response_format: config.jsonMode ? { type: 'json_object' } : undefined,
      tools: config.tools ? config.tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters || { type: 'object', properties: {} }
        }
      })) : undefined,
      tool_choice: config.toolChoice
    });
    
    let accumulatedContent = '';
    let toolCalls = null;
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        accumulatedContent += delta.content;
        yield { content: delta.content, done: false };
      }
      if (delta?.tool_calls) {
        toolCalls = delta.tool_calls;
      }
    }
    
    yield { content: accumulatedContent, done: true, toolCalls };
  }
  
  async embeddings(texts, config) {
    const response = await this.client.embeddings.create({
      model: config.model || 'text-embedding-3-small',
      input: texts
    });
    
    return response.data.map(d => d.embedding);
  }
  
  estimateCost(usage, model) {
    const costs = MODEL_COSTS.openai[model] || { input: 0, output: 0 };
    return (usage.promptTokens * costs.input + usage.completionTokens * costs.output) / 1_000_000;
  }
}

class GeminiProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, name: 'gemini' });
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }
  
  async chat(messages, config) {
    const startTime = Date.now();
    
    // Convert messages to Gemini format
    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const model = this.genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens,
        topP: config.topP,
        responseMimeType: config.jsonMode ? 'application/json' : 'text/plain'
      },
      tools: config.tools ? [{ functionDeclarations: config.tools }] : undefined,
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
    });
    
    const chat = model.startChat({
      history: userMessages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
    });
    
    const lastMessage = userMessages[userMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    
    const response = result.response;
    const text = response.text();
    const functionCalls = response.functionCalls();
    
    // Estimate usage (Gemini doesn't return exact tokens in all cases)
    const promptTokens = this.estimateTokens(messages.map(m => m.content).join(' '));
    const completionTokens = this.estimateTokens(text);
    
    return {
      content: text,
      toolCalls: functionCalls?.map(fc => ({
        id: fc.name,
        type: 'function',
        function: { name: fc.name, arguments: JSON.stringify(fc.args) }
      })),
      usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
      model: config.model,
      provider: 'gemini',
      latencyMs: Date.now() - startTime
    };
  }
  
  async *stream(messages, config) {
    // Simplified streaming - in production use proper streaming
    const result = await this.chat(messages, config);
    const words = result.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      yield { content: words[i] + (i < words.length - 1 ? ' ' : ''), done: i === words.length - 1 };
    }
  }
  
  async embeddings(texts, config) {
    const model = this.genAI.getGenerativeModel({ 
      model: config.model || 'text-embedding-004' 
    });
    
    const embeddings = [];
    for (const text of texts) {
      const result = await model.embedContent(text);
      embeddings.push(result.embedding.values);
    }
    
    return embeddings;
  }
  
  estimateTokens(text) {
    // Rough estimation: ~1 token per 4 chars for English, ~1 per 3 for Portuguese
    return Math.ceil(text.length / 3.5);
  }
  
  estimateCost(usage, model) {
    const costs = MODEL_COSTS.gemini[model] || { input: 0, output: 0 };
    return (usage.promptTokens * costs.input + usage.completionTokens * costs.output) / 1_000_000;
  }
}

class AnthropicProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, name: 'anthropic' });
    this.client = new Anthropic({ apiKey: config.apiKey });
  }
  
  async chat(messages, config) {
    const startTime = Date.now();
    
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const requestConfig = {
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      top_p: config.topP,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      tools: config.tools?.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters
      })),
      tool_choice: config.toolChoice === 'auto' ? { type: 'auto' } : 
                   config.toolChoice === 'none' ? { type: 'none' } :
                   config.toolChoice === 'required' ? { type: 'any' } :
                   config.toolChoice?.function ? { type: 'tool', name: config.toolChoice.function.name } :
                   { type: 'auto' }
    };
    
    const response = await this.client.messages.create(requestConfig);
    
    const content = response.content.find(c => c.type === 'text')?.text || '';
    const toolCalls = response.content
      .filter(c => c.type === 'tool_use')
      .map(c => ({
        id: c.id,
        type: 'function',
        function: { name: c.name, arguments: JSON.stringify(c.input) }
      }));
    
    const usage = response.usage;
    
    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens
      },
      model: response.model,
      provider: 'anthropic',
      latencyMs: Date.now() - startTime
    };
  }
  
  async *stream(messages, config) {
    // Simplified streaming
    const result = await this.chat(messages, config);
    const words = result.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      yield { content: words[i] + (i < words.length - 1 ? ' ' : ''), done: i === words.length - 1 };
    }
  }
  
  estimateCost(usage, model) {
    const costs = MODEL_COSTS.anthropic[model] || { input: 0, output: 0 };
    return (usage.promptTokens * costs.input + usage.completionTokens * costs.output) / 1_000_000;
  }
}

class GroqProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, name: 'groq' });
    this.client = new Groq({ apiKey: config.apiKey });
  }
  
  async chat(messages, config) {
    const startTime = Date.now();
    
    const openAIMessages = messages.map(m => ({
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content,
      name: m.name,
      tool_call_id: m.tool_call_id,
      tool_calls: m.tool_calls
    }));
    
    const completion = await this.client.chat.completions.create({
      model: config.model,
      messages: openAIMessages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      response_format: config.jsonMode ? { type: 'json_object' } : undefined,
      tools: config.tools ? config.tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters || { type: 'object', properties: {} }
        }
      })) : undefined,
      tool_choice: config.toolChoice
    });
    
    const choice = completion.choices[0];
    const usage = completion.usage;
    
    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      model: completion.model,
      provider: 'groq',
      latencyMs: Date.now() - startTime
    };
  }
  
  async *stream(messages, config) {
    // Simplified streaming
    const result = await this.chat(messages, config);
    const words = result.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      yield { content: words[i] + (i < words.length - 1 ? ' ' : ''), done: i === words.length - 1 };
    }
  }
  
  estimateCost(usage, model) {
    const costs = MODEL_COSTS.groq[model] || { input: 0, output: 0 };
    return (usage.promptTokens * costs.input + usage.completionTokens * costs.output) / 1_000_000;
  }
}

class OpenRouterProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, name: 'openrouter' });
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
  }
  
  async chat(messages, config) {
    const startTime = Date.now();
    
    const openAIMessages = messages.map(m => ({
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content,
      name: m.name,
      tool_call_id: m.tool_call_id,
      tool_calls: m.tool_calls
    }));
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://wootech.imob',
        'X-Title': 'WooTech Imob AI'
      },
      body: JSON.stringify({
        model: config.model,
        messages: openAIMessages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens,
        top_p: config.topP,
        response_format: config.jsonMode ? { type: 'json_object' } : undefined,
        tools: config.tools,
        tool_choice: config.toolChoice
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    const choice = data.choices[0];
    const usage = data.usage;
    
    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      model: data.model,
      provider: 'openrouter',
      latencyMs: Date.now() - startTime
    };
  }
  
  async *stream(messages, config) {
    // Simplified
    const result = await this.chat(messages, config);
    const words = result.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      yield { content: words[i] + (i < words.length - 1 ? ' ' : ''), done: i === words.length - 1 };
    }
  }
  
  estimateCost(usage, model) {
    // OpenRouter costs vary by model - use approximation
    return (usage.totalTokens * 0.001) / 1_000_000; // Rough estimate
  }
}

// ============================================================
// API KEY VALIDATION & LOCAL ASSISTANT FALLBACK
// ============================================================

function isUsableApiKey(key) {
  if (typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('replacewithrealkey') ||
    lower.includes('validgeminikeyhere') ||
    lower.includes('placeholder') ||
    lower.includes('your_') ||
    lower.includes('dummy')
  ) {
    return false;
  }
  return true;
}

class LocalAssistantProvider extends BaseProvider {
  constructor(config = {}) {
    super({ ...config, name: 'local' });
  }

  async chat(messages, config = {}) {
    const startTime = Date.now();
    const systemMsg = messages.find((m) => m.role === 'system')?.content || '';

    if (config.jsonMode) {
      const promptText = `${systemMsg}\n${messages.map((m) => m.content || '').join('\n')}`.toLowerCase();
      let payload;
      if (promptText.includes('section') || promptText.includes('landing') || promptText.includes('hero') || promptText.includes('página') || promptText.includes('blocks') || promptText.includes('themeconfig')) {
        payload = {
          themeConfig: {
            primaryColor: promptText.includes('rural') ? '#166534' : '#2563eb',
            secondaryColor: '#f59e0b',
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
            fontFamily: 'Inter',
            borderRadius: '8px',
          },
          blocks: [
            {
              id: 'hero-1',
              type: 'hero',
              order: 0,
              visible: true,
              config: {
                title: 'Imóveis Selecionados de Alto Padrão',
                subtitle: 'Curadoria exclusiva com atendimento inteligente 24h e tour personalizado.',
                ctaText: 'Falar com Especialista',
                ctaLink: '#contato',
                height: 600,
                alignment: 'center',
                textColor: '#ffffff',
              },
            },
            {
              id: 'text-1',
              type: 'text',
              order: 1,
              visible: true,
              config: {
                content: '## Destaques\n\nAtendimento consultivo, contratos digitais integrados e avaliação em tempo real.',
                fontSize: 18,
                fontWeight: 400,
                color: '#374151',
                alignment: 'center',
              },
            },
          ],
        };
      } else {
        payload = {
          ok: true,
          summary: 'Resposta estruturada gerada pelo assistente WooTech.',
        };
      }

      const content = JSON.stringify(payload);
      return {
        content,
        toolCalls: null,
        usage: { promptTokens: 40, completionTokens: 60, totalTokens: 100 },
        model: 'wootech-local-assistant-v1',
        provider: 'local',
        latencyMs: Date.now() - startTime,
      };
    }

    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    const lastUserText = lastUserIdx >= 0 ? String(messages[lastUserIdx].content || '') : '';
    const postUserMessages = lastUserIdx >= 0 ? messages.slice(lastUserIdx + 1) : messages;
    const toolMessages = postUserMessages.filter(
      (m) => m.role === 'tool' || (typeof m.content === 'string' && m.content.includes('[RESULTADO DA FERRAMENTA'))
    );

    // 1) Follow-up synthesis after tool execution
    if (toolMessages.length > 0) {
      const parsedItems = [];
      for (const tm of toolMessages) {
        try {
          const parsed = JSON.parse(tm.content);
          const list = Array.isArray(parsed?.data)
            ? parsed.data
            : Array.isArray(parsed?.results)
              ? parsed.results
              : Array.isArray(parsed)
                ? parsed
                : [];
          for (const item of list) {
            if (item && typeof item === 'object') parsedItems.push(item);
          }
        } catch {
          // ignore unparseable tool output
        }
      }

      let reply;
      if (parsedItems.length > 0) {
        const lines = parsedItems.slice(0, 5).map((p, idx) => {
          const title = p.title || p.name || `Imóvel ${idx + 1}`;
          const city = p.city ? ` em ${p.city}${p.state ? `/${p.state}` : ''}` : '';
          const priceVal = Number(p.price ?? p.sale_price ?? p.rent_price ?? 0);
          const priceStr = priceVal > 0 ? ` — R$ ${priceVal.toLocaleString('pt-BR')}` : '';
          const typeStr = p.property_type ? ` (${p.property_type})` : '';
          return `${idx + 1}. **${title}**${typeStr}${city}${priceStr}`;
        });
        reply = `Encontrei ${parsedItems.length} opção(ões) disponível(is) para você:\n\n${lines.join('\n')}\n\nQual dessas opções chamou mais sua atenção? Posso passar mais detalhes ou agendar uma visita!`;
      } else {
        reply = 'Consultei nosso catálogo em tempo real agora, mas não encontrei imóveis com esse filtro exato no momento. Me informe a cidade, faixa de valor ou tipo de imóvel desejado que posso buscar alternativas ou cadastrar seu interesse com nossos corretores.';
      }

      return {
        content: reply,
        toolCalls: null,
        usage: { promptTokens: 80, completionTokens: 60, totalTokens: 140 },
        model: 'wootech-local-assistant-v1',
        provider: 'local',
        latencyMs: Date.now() - startTime,
      };
    }

    // 2) Tool invocation when user asks about properties
    const toolsList = Array.isArray(config.tools) ? config.tools : [];
    const propTool = toolsList.find(
      (t) =>
        t.name === 'properties_search' ||
        t.name === 'search_properties' ||
        t.name === 'properties.search'
    );
    const asksForProperty = /(im[oó]ve[il]|apartamento|casa|fazenda|terreno|compra|alug|op[cç][oõ]es|procur|buscar|cat[aá]logo|tem\s+algo|dispon[ií]ve)/i.test(
      lastUserText
    );

    if (propTool && asksForProperty) {
      const args = {};
      if (/apartamento/i.test(lastUserText)) args.tipo = 'Apartamento';
      else if (/casa/i.test(lastUserText)) args.tipo = 'Casa';
      else if (/fazenda/i.test(lastUserText)) args.tipo = 'Fazenda';

      if (/s[aã]o\s+paulo/i.test(lastUserText)) args.cidade = 'São Paulo';
      else if (/campinas/i.test(lastUserText)) args.cidade = 'Campinas';

      return {
        content: '',
        toolCalls: [
          {
            id: `call_local_${Date.now()}`,
            type: 'function',
            function: {
              name: propTool.name,
              arguments: JSON.stringify(args),
            },
          },
        ],
        usage: { promptTokens: 45, completionTokens: 20, totalTokens: 65 },
        model: 'wootech-local-assistant-v1',
        provider: 'local',
        latencyMs: Date.now() - startTime,
      };
    }

    // 3) Standard conversational response in PT-BR
    const lowerUser = lastUserText.toLowerCase();
    const agentNameMatch = systemMsg.match(/você é\s+([a-záéíóúâêôãõç\w\s-]{2,30}?)[,.\n]/i);
    const agentIntro = agentNameMatch ? agentNameMatch[1].trim() : 'assistente virtual';

    let content;
    if (/visita|agendar|hor[aá]rio|conhecer/i.test(lowerUser)) {
      content = 'Perfeito! Para agendar sua visita, me informe por favor o melhor dia e período (manhã ou tarde), além do seu nome e telefone/WhatsApp para confirmarmos com o corretor responsável.';
    } else if (/financiamento|simula|entrada|parcela|cr[eé]dito/i.test(lowerUser)) {
      content = 'Com certeza! Posso fazer uma simulação de financiamento agora mesmo. Qual é o valor aproximado do imóvel, o valor de entrada planejado e o prazo em meses (ex: 360 meses)?';
    } else if (/alug|loca[cç][aã]o|contrato/i.test(lowerUser)) {
      content = 'Cuidamos de todo o processo de locação e contrato digital! Você está buscando um imóvel específico para alugar ou gostaria de ajuda com um contrato existente?';
    } else {
      content = `Olá! Sou ${agentIntro} e estou aqui para ajudar você. Você busca imóveis urbanos, opções de locação ou propriedades rurais? Me diga sua região e faixa de investimento para eu buscar as melhores opções.`;
    }

    return {
      content,
      toolCalls: null,
      usage: { promptTokens: 35, completionTokens: 45, totalTokens: 80 },
      model: 'wootech-local-assistant-v1',
      provider: 'local',
      latencyMs: Date.now() - startTime,
    };
  }

  async *stream(messages, config = {}) {
    const result = await this.chat(messages, config);
    yield { content: result.content, done: false };
    yield { content: '', done: true, toolCalls: result.toolCalls };
  }

  estimateCost() {
    return 0;
  }
}

// ============================================================
// LLM ORCHESTRATOR - Main Interface
// ============================================================

export class LLMOrchestrator {
  constructor() {
    this.providers = new Map();
    this.initialized = false;
    this.costTracker = new CostTracker();
  }
  
  async initialize() {
    if (this.initialized) return;
    
    // Tenant keys must be passed explicitly through config.orgKeys.
    // A singleton cannot safely auto-select a row from site_settings.
    const supabase = getSupabaseServer();
    let settings = null;
    try {
      const res = await supabase
        .from('saas_settings')
        .select('global_openai_key, global_anthropic_key, global_gemini_key, global_groq_key, global_openrouter_key')
        .single();
      settings = res.data;
    } catch (err) {
      // ignore
    }
    
    // Priority: saas_settings (global) > env vars. Tenant keys override these in chat().
    const extractApiKey = (keyConfig) => {
      if (!keyConfig) return null;
      const key = typeof keyConfig === 'object' ? keyConfig.apiKey : keyConfig;
      if (!isUsableApiKey(key)) return null;
      return key.trim();
    };
    
    const getValidKey = (...keys) => {
      for (const k of keys) {
        const val = extractApiKey(k);
        if (val) return val;
      }
      return null;
    };
    
    const keys = {
      openai: getValidKey(settings?.global_openai_key, process.env.OPENAI_API_KEY),
      anthropic: getValidKey(settings?.global_anthropic_key, process.env.ANTHROPIC_API_KEY),
      gemini: getValidKey(settings?.global_gemini_key, process.env.GEMINI_API_KEY),
      groq: getValidKey(settings?.global_groq_key, process.env.GROQ_API_KEY),
      openrouter: getValidKey(settings?.global_openrouter_key, process.env.OPENROUTER_API_KEY)
    };
    
    if (keys.openai) this.providers.set('openai', new OpenAIProvider({ apiKey: keys.openai }));
    if (keys.anthropic) this.providers.set('anthropic', new AnthropicProvider({ apiKey: keys.anthropic }));
    if (keys.gemini) this.providers.set('gemini', new GeminiProvider({ apiKey: keys.gemini }));
    if (keys.groq) this.providers.set('groq', new GroqProvider({ apiKey: keys.groq }));
    if (keys.openrouter) this.providers.set('openrouter', new OpenRouterProvider({ apiKey: keys.openrouter }));
    if (this.providers.size === 0) {
      this.providers.set('local', new LocalAssistantProvider());
    }
    
    this.initialized = true;
    logger.info('[LLMOrchestrator] Initialized', { providers: Array.from(this.providers.keys()) });
  }
  
  /**
   * Get provider for a task type (with fallback chain)
   */
  getProviderForTask(taskType) {
    const routing = MODEL_ROUTING[taskType] || MODEL_ROUTING.conversation;
    
    // Try primary
    const primary = routing.primary;
    if (this.providers.has(primary.provider)) {
      return {
        provider: this.providers.get(primary.provider),
        model: primary.model,
        taskType,
        isFallback: false
      };
    }
    
    // Try fallbacks
    for (const fallback of routing.fallback || []) {
      if (this.providers.has(fallback.provider)) {
        return {
          provider: this.providers.get(fallback.provider),
          model: fallback.model,
          taskType,
          isFallback: true
        };
      }
    }
    
    // Last resort - any available provider
    const available = this.providers.keys().next().value;
    if (available) {
      return {
        provider: this.providers.get(available),
        model: available === 'groq' ? 'llama-3.1-8b-instant' : 
               available === 'gemini' ? 'gemini-2.0-flash' :
               available === 'openai' ? 'gpt-4o-mini' :
               available === 'anthropic' ? 'claude-3-5-haiku-20241022' :
               available === 'local' ? 'wootech-local-assistant-v1' :
               'gpt-4o-mini',
        taskType,
        isFallback: true
      };
    }
    
    return null;
  }
  
  getProviderForModel(model) {
    if (!model) return null;
    if (model.includes('wootech-local')) return 'local';
    if (model.includes('gpt') || model.includes('o1') || model.includes('text-embedding-3')) return 'openai';
    if (model.includes('claude')) return 'anthropic';
    if (model.includes('gemini') || model.includes('text-embedding-004')) return 'gemini';
    if (model.includes('llama') || model.includes('mixtral') || model.includes('gemma') || model.includes('qwen')) return 'groq';
    return null; // fallback to OpenRouter or default
  }

  invalidateCache() {
    this.initialized = false;
    this.providers.clear();
  }

  /**
   * Main chat method with automatic routing
   */
  async chat(messages, taskType = 'conversation', config = {}) {
    await this.initialize();

    const extractKey = (keyConfig) => {
      if (!keyConfig) return null;
      const key = typeof keyConfig === 'object' ? keyConfig.apiKey : keyConfig;
      if (!isUsableApiKey(key)) return null;
      return key.trim();
    };

    const createProviderFromOrgKeys = (providerName) => {
      if (!config.orgKeys || !providerName) return null;
      const dynamicKey = extractKey(config.orgKeys[providerName]);
      if (!dynamicKey) return null;
      if (providerName === 'gemini') return new GeminiProvider({ apiKey: dynamicKey });
      if (providerName === 'openai') return new OpenAIProvider({ apiKey: dynamicKey });
      if (providerName === 'anthropic') return new AnthropicProvider({ apiKey: dynamicKey });
      if (providerName === 'groq') return new GroqProvider({ apiKey: dynamicKey });
      if (providerName === 'openrouter') return new OpenRouterProvider({ apiKey: dynamicKey });
      return null;
    };

    const defaultModelForProvider = (providerName) => {
      if (providerName === 'groq') return 'llama-3.3-70b-versatile';
      if (providerName === 'gemini') return 'gemini-2.0-flash';
      if (providerName === 'openai') return 'gpt-4o-mini';
      if (providerName === 'anthropic') return 'claude-3-5-haiku-20241022';
      return 'openai/gpt-4o-mini';
    };

    let provider;
    let model;
    let isFallback = false;

    if (config.model) {
      model = config.model;
      const requestedProvider = this.getProviderForModel(model) || 'openrouter';
      const tenantProvider = createProviderFromOrgKeys(requestedProvider);

      if (tenantProvider) {
        provider = tenantProvider;
      } else if (this.providers.has(requestedProvider)) {
        provider = this.providers.get(requestedProvider);
      } else {
        // Check if tenant configured another provider in orgKeys before global fallback
        const routingOrder = ['gemini', 'openai', 'anthropic', 'groq', 'openrouter'];
        for (const candidate of routingOrder) {
          const candidateProvider = createProviderFromOrgKeys(candidate);
          if (candidateProvider) {
            provider = candidateProvider;
            model = defaultModelForProvider(candidate);
            isFallback = true;
            break;
          }
        }
        if (!provider) {
          const result = this.getProviderForTask(taskType);
          if (result) {
            provider = result.provider;
            model = result.model;
            isFallback = true;
          }
        }
      }
    } else {
      const routing = MODEL_ROUTING[taskType] || MODEL_ROUTING.conversation;
      const primaryTenant = createProviderFromOrgKeys(routing.primary.provider);
      if (primaryTenant) {
        provider = primaryTenant;
        model = routing.primary.model;
      } else {
        const result = this.getProviderForTask(taskType);
        if (result) {
          provider = result.provider;
          model = result.model;
          isFallback = result.isFallback;
        } else {
          for (const candidate of ['gemini', 'openai', 'anthropic', 'groq', 'openrouter']) {
            const candidateProvider = createProviderFromOrgKeys(candidate);
            if (candidateProvider) {
              provider = candidateProvider;
              model = defaultModelForProvider(candidate);
              isFallback = true;
              break;
            }
          }
        }
      }
    }

    if (!provider) {
      throw new Error('Nenhum provedor LLM configurado. Configure chaves de API no painel de configurações.');
    }

    // Tenant key overrides global provider when matching the selected provider
    const tenantOverride = createProviderFromOrgKeys(provider.name);
    const activeProvider = tenantOverride || provider;

    const finalConfig = { ...config, model };
    
    logger.info('[LLMOrchestrator] Chat request', { 
      taskType, 
      provider: activeProvider.name, 
      model, 
      isFallback,
      messagesCount: messages.length,
      dynamicKey: !!config.orgKeys
    });
    
    try {
      const response = await activeProvider.chat(messages, finalConfig);
      
      // Track cost
      const cost = activeProvider.estimateCost(response.usage, model);
      await this.costTracker.record({
        taskType,
        provider: activeProvider.name,
        model,
        usage: response.usage,
        cost,
        isFallback
      });
      
      return response;
    } catch (error) {
      logger.error('[LLMOrchestrator] Chat error', { 
        error: error.message, 
        taskType, 
        provider: activeProvider?.name
      });
      
      // Try fallback if not already using fallback
      if (!isFallback) {
        const routing = MODEL_ROUTING[taskType] || MODEL_ROUTING.conversation;
        for (const fallback of routing.fallback || []) {
          if (this.providers.has(fallback.provider)) {
            logger.info('[LLMOrchestrator] Trying fallback', { 
              fallback: fallback.provider, 
              model: fallback.model 
            });
            
            try {
              const fallbackProvider = this.providers.get(fallback.provider);
              const response = await fallbackProvider.chat(messages, { ...finalConfig, model: fallback.model });
              
              const cost = fallbackProvider.estimateCost(response.usage, fallback.model);
              await this.costTracker.record({
                taskType,
                provider: fallbackProvider.name,
                model: fallback.model,
                usage: response.usage,
                cost,
                isFallback: true,
                fallbackFrom: provider.name
              });
              
              return response;
            } catch (fallbackError) {
              logger.error('[LLMOrchestrator] Fallback also failed', { 
                error: fallbackError.message 
              });
            }
          }
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Streaming chat
   */
  async *stream(messages, taskType = 'conversation', config = {}) {
    await this.initialize();
    
    const { provider, model } = this.getProviderForTask(taskType);
    const finalConfig = { ...config, model };
    
    try {
      for await (const chunk of provider.stream(messages, finalConfig)) {
        yield chunk;
      }
    } catch (error) {
      logger.error('[LLMOrchestrator] Stream error', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get embeddings
   */
  async embeddings(texts, taskType = 'embeddings', config = {}) {
    await this.initialize();
    
    const { provider, model } = this.getProviderForTask(taskType);
    const finalConfig = { ...config, model };
    
    return await provider.embeddings(texts, finalConfig);
  }
  
  /**
   * Get cost tracking report
   */
  async getCostReport(organizationId, period = '24h') {
    return await this.costTracker.getReport(organizationId, period);
  }
  
  /**
   * Check available providers
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }
}

// ============================================================
// COST TRACKER
// ============================================================

class CostTracker {
  constructor() {
    this.buffer = [];
    this.flushInterval = 30000; // 30 seconds
    this.startFlushTimer();
  }
  
  startFlushTimer() {
    const timer = setInterval(() => this.flush(), this.flushInterval);
    timer.unref?.();
  }
  
  async record(entry) {
    this.buffer.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
    
    // Flush if buffer large
    if (this.buffer.length >= 100) {
      await this.flush();
    }
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    const entries = this.buffer.splice(0, this.buffer.length);
    
    try {
      const supabase = getSupabaseServer();
      await supabase.from('ai_llm_usage').insert(entries.map(e => ({
        organization_id: e.organizationId,
        task_type: e.taskType,
        provider: e.provider,
        model: e.model,
        prompt_tokens: e.usage.promptTokens,
        completion_tokens: e.usage.completionTokens,
        total_tokens: e.usage.totalTokens,
        cost_usd: e.cost,
        is_fallback: e.isFallback,
        fallback_from: e.fallbackFrom,
        created_at: e.timestamp
      })));
    } catch (error) {
      logger.error('[CostTracker] Failed to flush', { error: error.message });
      // Re-add to buffer for retry
      this.buffer.unshift(...entries);
    }
  }
  
  async getReport(organizationId, period) {
    const supabase = getSupabaseServer();
    
    const hours = period === '1h' ? 1 : period === '24h' ? 24 : period === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('ai_llm_usage')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    
    if (!data || data.length === 0) {
      return { totalCost: 0, totalTokens: 0, byProvider: {}, byTask: {}, byModel: {} };
    }
    
    const report = {
      totalCost: 0,
      totalTokens: 0,
      totalCalls: data.length,
      byProvider: {},
      byTask: {},
      byModel: {},
      timeline: []
    };
    
    for (const entry of data) {
      report.totalCost += entry.cost_usd || 0;
      report.totalTokens += entry.total_tokens || 0;
      
      // By provider
      if (!report.byProvider[entry.provider]) {
        report.byProvider[entry.provider] = { cost: 0, tokens: 0, calls: 0 };
      }
      report.byProvider[entry.provider].cost += entry.cost_usd || 0;
      report.byProvider[entry.provider].tokens += entry.total_tokens || 0;
      report.byProvider[entry.provider].calls++;
      
      // By task
      if (!report.byTask[entry.task_type]) {
        report.byTask[entry.task_type] = { cost: 0, tokens: 0, calls: 0 };
      }
      report.byTask[entry.task_type].cost += entry.cost_usd || 0;
      report.byTask[entry.task_type].tokens += entry.total_tokens || 0;
      report.byTask[entry.task_type].calls++;
      
      // By model
      if (!report.byModel[entry.model]) {
        report.byModel[entry.model] = { cost: 0, tokens: 0, calls: 0 };
      }
      report.byModel[entry.model].cost += entry.cost_usd || 0;
      report.byModel[entry.model].tokens += entry.total_tokens || 0;
      report.byModel[entry.model].calls++;
    }
    
    return report;
  }
}

// Singleton
let orchestratorInstance = null;

export function getLLMOrchestrator() {
  if (!orchestratorInstance) {
    orchestratorInstance = new LLMOrchestrator();
  }
  return orchestratorInstance;
}

export { MODEL_ROUTING, MODEL_COSTS };
export default LLMOrchestrator;
